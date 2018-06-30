App.OptimizeColorChannel = (function(PixelMath, Image){

    function ChannelStats(statsBuffer){
        this.buffer = statsBuffer;
        this.bucketIndexSet = createBucketIndexSet(statsBuffer);
    }

    function createBucketIndexSet(statsBuffer){
        const bucketIndexSet = new Set();
        const length = statsBuffer.length;
        for(let i=0,bucketIndex=0;i<length;i+=4,bucketIndex++){
            if(statsBuffer[i+3] === 0){
                continue;
            }
            bucketIndexSet.add(bucketIndex);
        }

        return bucketIndexSet;
    }

    function createImageChannels(pixels, numColors){
        const maxLightnessDiffCubed = 127 * 127 * 127;

        const hueBuffer = new Float32Array(360 * 4);
        const numLightnessBuckets = Math.min(256, numColors);
        const lightnessBuffer = new Float32Array(numLightnessBuckets * 4);
        const lightnessFraction = 256 / numLightnessBuckets;

        Image.forEachOpaquePixel(pixels, (pixel)=>{
            const hue = PixelMath.hue(pixel);
            const saturation = PixelMath.saturation(pixel);
            const lightness = PixelMath.lightness(pixel);

            //increment hue buffer
            //hue percentages from createHslPopularityMap in optimize palette perceptual
            const lightnessDiff = lightness >= 128 ? lightness - 128 : 127 - lightness;
            const hueCountFraction = saturation * saturation * saturation / 1000000 * ((maxLightnessDiffCubed - lightnessDiff * lightnessDiff * lightnessDiff) / maxLightnessDiffCubed);
            const hueIndex = hue * 4;
            hueBuffer[hueIndex]   += pixel[0] * hueCountFraction;
            hueBuffer[hueIndex+1] += pixel[1] * hueCountFraction;
            hueBuffer[hueIndex+2] += pixel[2] * hueCountFraction;
            hueBuffer[hueIndex+3] += hueCountFraction;


            //increment lightness buffer
            const lightnessIndex = Math.floor(lightness / lightnessFraction) * 4;
            lightnessBuffer[lightnessIndex]   += pixel[0];
            lightnessBuffer[lightnessIndex+1] += pixel[1];
            lightnessBuffer[lightnessIndex+2] += pixel[2];
            lightnessBuffer[lightnessIndex+3]++;
        });

        return {
            hueChannel: new ChannelStats(hueBuffer),
            lightnessChannel: new ChannelStats(lightnessBuffer),
        }
    }

    function mergeSmallerComparison(a, b){
        return a < b;
    }

    function mergeGreaterComparison(a, b){
        return a > b;
    }

    function reduceChannelBuckets(channelStats, reducedBucketCount, shouldMergeGreater=false, shouldAlternateComparisons=false, shouldWrap=false){
        if(reducedBucketCount <= 0){
            channelStats.bucketIndexSet.clear();
            return;
        }

        //copy channel counts into single buffer, which makes logic of comparing counts easire
        //and improves memory adjacency
        const channelBuffer = channelStats.buffer;
        const bucketCounts = new Float32Array(channelBuffer.length / 4);
        for(let i=3,bucketIndex=0;i<channelBuffer.length;i+=4,bucketIndex++){
            bucketCounts[bucketIndex] = channelBuffer[i];
        }
        const bucketIndexSet = channelStats.bucketIndexSet;
        const numReductions = bucketIndexSet.size - reducedBucketCount;
        for(let i=0;i<numReductions;i++){
            if(shouldAlternateComparisons){
                shouldMergeGreater = i > numReductions / 2;
            }
            const bucketKeys = [...bucketIndexSet.keys()];
            const lastKeyIndex = bucketKeys.length - 1;
            let keyToMergeCombinedValue = shouldMergeGreater ? -1 : Infinity;
            const comparisonFunc = shouldMergeGreater ? mergeGreaterComparison: mergeSmallerComparison;
            let keyToMergeStartIndex = -1;
            
            for(let j=0;j<lastKeyIndex;j++){
                const combinedValue = bucketCounts[bucketKeys[j]] + bucketCounts[bucketKeys[j+1]];
                if(comparisonFunc(combinedValue, keyToMergeCombinedValue)){
                    keyToMergeCombinedValue = combinedValue;
                    keyToMergeStartIndex = j;
                }
            }
            //for hues which wrap around
            if(shouldWrap){
                const wrappedCombinedValue = bucketCounts[bucketKeys[lastKeyIndex]] + bucketCounts[bucketKeys[0]];
                if(comparisonFunc(wrappedCombinedValue, keyToMergeCombinedValue)){
                    keyToMergeCombinedValue = wrappedCombinedValue;
                    keyToMergeStartIndex = lastKeyIndex;
                }
            }
            const keyToDelete = keyToMergeStartIndex === lastKeyIndex ? bucketKeys[0] : bucketKeys[keyToMergeStartIndex + 1];

            //reduce by combining values of keyToDelet with leastCombinedStartIndex
            const bucketKeyToMergeTo = bucketKeys[keyToMergeStartIndex]; 
            const bufferStartIndex = bucketKeyToMergeTo * 4;
            const bufferMergeIndex = keyToDelete * 4;

            for(let j=0;j<4;j++){
                channelBuffer[bufferStartIndex + j] += channelBuffer[bufferMergeIndex + j]; 
            }
            //update color counts
            bucketCounts[bucketKeyToMergeTo] += bucketCounts[keyToDelete];

            bucketIndexSet.delete(keyToDelete);
        }
    }

    function loadPaletteBuffer(channelStats, paletteBuffer, startIndex=0){
        const channelBuffer = channelStats.buffer;
        let paletteIndex = startIndex * 3;

        for(let bucketIndex of channelStats.bucketIndexSet.keys()){
            const bufferIndex = bucketIndex * 4;
            const pixelCount = channelBuffer[bufferIndex + 3];

            paletteBuffer[paletteIndex++] = Math.round(channelBuffer[bufferIndex] / pixelCount);
            paletteBuffer[paletteIndex++] = Math.round(channelBuffer[bufferIndex+1] / pixelCount);
            paletteBuffer[paletteIndex++] = Math.round(channelBuffer[bufferIndex+2] / pixelCount);
        }
    }
    
    function colorChannel(pixels, numColors, colorQuantization, _imageWidth, _imageHeight, progressCallback){
        const paletteBuffer = new Uint8Array(numColors * 3);
        const {hueChannel, lightnessChannel} = createImageChannels(pixels, numColors);
        const numHueBuckets = hueChannel.bucketIndexSet.size;
        const numLightnessBuckets = lightnessChannel.bucketIndexSet.size;

        if(numHueBuckets + numLightnessBuckets > numColors){
            console.log('reducing channels');
            //if more unique hues than number of colors, only use 2 lightness values (black and white)
            //otherwise use lightness (grey) values to fill up palette
            const lightnessBucketCount = Math.max(2, numColors - numHueBuckets);
            reduceChannelBuckets(lightnessChannel, lightnessBucketCount);
            reduceChannelBuckets(hueChannel, numColors - lightnessBucketCount, colorQuantization.isWide, colorQuantization.alternateComparisons, true);
            // reduceChannelBucketsAlternate(hueChannel, numColors - lightnessBucketCount, true);
        }

        console.log('reduced hue channel');
        console.log(hueChannel);
        console.log('reduced lightness channel');
        console.log(lightnessChannel);

        loadPaletteBuffer(lightnessChannel, paletteBuffer);
        //have to get new bucket size since we might have reduced it
        loadPaletteBuffer(hueChannel, paletteBuffer, lightnessChannel.bucketIndexSet.size);
        return paletteBuffer;
    }
    
    return {
       colorChannel,
    };
})(App.PixelMath, App.Image);