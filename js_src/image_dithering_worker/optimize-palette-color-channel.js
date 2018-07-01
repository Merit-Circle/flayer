/**
 * The broad overview of how this algorithm works is to store the average of each pixel for each distinct hue
 * and each distinct lightness (lightness divided into buckets by the number of ouput palette colors), 
 * and then merge the values with the least number of pixels to get our palette.
 * Conceptually similar to octree, but much faster, since while the merging is slightly less effecient since it
 * involves nested loops O(n^2) actually reading the pixels is much faster and more efficient than octree.
 * Works particularly well at preserving gradients
 */
App.OptimizeColorChannel = (function(PixelMath, Image){

    function ChannelStats(statsBuffer, count){
        this.buffer = statsBuffer;
        this.bucketIndexSet = createBucketIndexSet(statsBuffer);
        this.count = count;
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
        let hueCount = 0;
        let lightnessCount = 0;

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
            hueCount += hueCountFraction;


            //increment lightness buffer
            const lightnessIndex = Math.floor(lightness / lightnessFraction) * 4;
            const lightnessCountFraction = 1 - hueCountFraction;
            lightnessBuffer[lightnessIndex]   += pixel[0] * lightnessCountFraction;
            lightnessBuffer[lightnessIndex+1] += pixel[1] * lightnessCountFraction;
            lightnessBuffer[lightnessIndex+2] += pixel[2] * lightnessCountFraction;
            lightnessBuffer[lightnessIndex+3] += lightnessCountFraction;
            lightnessCount += lightnessCountFraction;
        });

        return {
            hueChannel: new ChannelStats(hueBuffer, hueCount),
            lightnessChannel: new ChannelStats(lightnessBuffer, lightnessCount),
        }
    }

    function calculatePenalty(bucketIndexDistance){
        return Math.log2(bucketIndexDistance + 1);
    }

    function reduceChannelBuckets(channelStats, reducedBucketCount, shouldWrap=false){
        if(reducedBucketCount <= 0){
            channelStats.bucketIndexSet.clear();
            return;
        }

        //copy channel counts into single buffer, which makes logic of comparing counts easire
        //and improves memory adjacency
        const channelBuffer = channelStats.buffer;
        const numDistinctValues = channelBuffer.length / 4;

        const penaltyDistanceFunc = shouldWrap ? (smallerBucketKey, largerBucketKey)=>{ return calculatePenalty(Math.min(smallerBucketKey + numDistinctValues - largerBucketKey, largerBucketKey - smallerBucketKey)); } : (smallerBucketKey, largerBucketKey)=>{ return calculatePenalty(largerBucketKey - smallerBucketKey); };

        const bucketCounts = new Float32Array(channelBuffer.length / 4);
        for(let i=3,bucketIndex=0;i<channelBuffer.length;i+=4,bucketIndex++){
            bucketCounts[bucketIndex] = channelBuffer[i];
        }
        const bucketIndexSet = channelStats.bucketIndexSet;
        const numReductions = bucketIndexSet.size - reducedBucketCount;
        for(let i=0;i<numReductions;i++){
            const bucketKeys = [...bucketIndexSet.keys()];
            const lastKeyIndex = bucketKeys.length - 1;
            let leastCombinedValue = Infinity;
            let keyToMergeStartIndex = -1;
            
            for(let j=0;j<lastKeyIndex;j++){
                const bucketKey1 = bucketKeys[j];
                const bucketKey2 = bucketKeys[j+1];
                //penalize buckets that are far away from each other
                const penalty = penaltyDistanceFunc(bucketKey1, bucketKey2);
                const combinedValue = (bucketCounts[bucketKey1] + bucketCounts[bucketKey2]) * penalty;
                if(combinedValue < leastCombinedValue){
                    leastCombinedValue = combinedValue;
                    keyToMergeStartIndex = j;
                }
            }
            //for hues which wrap around
            if(shouldWrap){
                const bucketKey1 = bucketKeys[lastKeyIndex];
                const bucketKey2 = bucketKeys[0];
                const penalty = penaltyDistanceFunc(bucketKey2, bucketKey1);
                const wrappedCombinedValue = (bucketCounts[bucketKey1] + bucketCounts[bucketKey2]) * penalty;
                if(wrappedCombinedValue < leastCombinedValue){
                    leastCombinedValue = wrappedCombinedValue;
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

    function reduceLightnessChannelToBw(lightnessChannel){
        const bucketKeys = [...lightnessChannel.bucketIndexSet.keys()];
        const newBucketIndexSet = new Set([bucketKeys[0], bucketKeys[bucketKeys.length - 1]]);

        return {
            bucketIndexSet: newBucketIndexSet,
            buffer: lightnessChannel.buffer,
        };
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
        let numLightnessBucketsAdjustment = 0;

        //increase contrast by always having black and white values
        if(numLightnessBuckets >= 2){
            numLightnessBucketsAdjustment = 2;
            const bwLightnessChannel = reduceLightnessChannelToBw(lightnessChannel);
            //have to load palette here, since we might be modifying lightness channel buffer with reduction
            loadPaletteBuffer(bwLightnessChannel, paletteBuffer);
        }
        const numColorsAdjusted = numColors - numLightnessBucketsAdjustment;
        if(numHueBuckets + numLightnessBuckets > numColorsAdjusted){
            const baseLightnessFraction = lightnessChannel.count / (lightnessChannel.count + hueChannel.count);
            //progressively add more grays as color count increases, use sqrt to decrease large baseLightnessFraction, while leaving small baseLightnessFraction relatively unchanged
            const hueFraction = hueChannel.count / (hueChannel.count + (lightnessChannel.count / (colorQuantization.greyMix * Math.sqrt(100 * baseLightnessFraction))) * (1 - Math.log2(numColors) / numColors));

            const lightnessBucketCount = Math.floor(numColorsAdjusted * (1-hueFraction));
            reduceChannelBuckets(lightnessChannel, lightnessBucketCount);
            //have to recalculate lightness bucket count, since it might have had less buckets than required
            reduceChannelBuckets(hueChannel, numColorsAdjusted - lightnessChannel.bucketIndexSet.size, true);
        }

        loadPaletteBuffer(lightnessChannel, paletteBuffer, numLightnessBucketsAdjustment);
        //have to get new bucket size since we might have reduced it
        loadPaletteBuffer(hueChannel, paletteBuffer, lightnessChannel.bucketIndexSet.size + numLightnessBucketsAdjustment);
        return paletteBuffer;
    }
    
    return {
       colorChannel,
    };
})(App.PixelMath, App.Image);