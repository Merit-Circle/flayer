(function(Vue, Canvas, Timer, Histogram, WorkerUtil, AlgorithmModel, Polyfills, WorkerHeaders, ColorPicker, ColorDitherModes){
    
    //used for calculating webworker performance
    var webworkerStartTime;
    
    //canvas stuff
    var histogramCanvas;
    var histogramCanvasIndicator;
    
    var sourceWebglTexture = null;
    
    var component = Vue.component('color-dither-section', {
        template: document.getElementById('color-dither-component'),
        props: ['sourceCanvas', 'transformCanvas', 'transformCanvasWebGl', 'isWebglEnabled', 'isWebglSupported', 'isLivePreviewEnabled'],
        mounted: function(){
            //have to get canvases here, because DOM manipulation needs to happen in mounted hook
            histogramCanvas = Canvas.create(this.$refs.histogramCanvas);
            //select first non-custom palette
            this.selectedPaletteIndex = 1;
            //set color dither mode to first item in map
            this.selectedColorDitherModeId = this.colorDitherModes.values().next().value.id;
        },
        data: function(){ 
            return{
                selectedDitherAlgorithmIndex: 0,
                hasImageBeenTransformed: false,
                histogramHeight: Histogram.height,
                histogramWidth: Histogram.colorWidth,
                ditherAlgorithms: AlgorithmModel.colorDitherAlgorithms,
                loadedImage: null,
                colors: [],
                colorsShadow: [],
                palettes: ColorPicker.palettes,
                selectedPaletteIndex: null,
                numColors: 4,
                numColorsMin: 2,
                numColorsMax: 12,
                colorDitherModes: ColorDitherModes,
                selectedColorDitherModeId: 0,
                colorDrag: {
                    droppedIndex: null,
                    dragoverIndex: null,
                    draggedIndex: null,
                },
            };
        },
        computed: {
            selectedDitherAlgorithm: function(){
                return this.ditherAlgorithms[this.selectedDitherAlgorithmIndex];
            },
            isSelectedAlgorithmWebGl: function(){
                return this.isWebglEnabled && !!this.selectedDitherAlgorithm.webGlFunc;
            },
            isImageLoaded: function(){
              return this.loadedImage != null;  
            },
            selectedColors: function(){
              return this.colors.slice(0, this.numColors);  
            },
            selectedColorsVec: function(){
                return ColorPicker.colorsToVecArray(this.selectedColors, this.numColorsMax);
            },
        },
        watch: {
            isLivePreviewEnabled: function(newValue){
                if(newValue){
                    this.ditherImageWithSelectedAlgorithm();
                }
            },
            selectedDitherAlgorithmIndex: function(newIndex){
                if(this.isImageLoaded && this.isLivePreviewEnabled){
                    this.ditherImageWithSelectedAlgorithm();
                }
            },
            numColors: function(newValue, oldValue){
                let value = newValue;
                if(value < this.numColorsMin){
                    value = this.numColorsMin;
                }
                else if(value > this.numColorsMax){
                    value = this.numColorsMax;
                }
                if(value !== this.numColors){
                    this.numColors = value;
                }
                if(value === oldValue){
                    return;
                }
                if(this.isImageLoaded && this.isLivePreviewEnabled){
                    this.ditherImageWithSelectedAlgorithm();
                }
            },
            colorsShadow: function(newValue){
                if(this.colorDrag.draggedIndex === null){
                    this.colors = this.colorsShadow.slice();   
                }
            },
            colors: function(newValue, oldValue){
                //don't dither image if colors changed are not enabled
                if(this.isImageLoaded && this.isLivePreviewEnabled && !ColorPicker.areColorArraysIdentical(newValue.slice(0, this.numColors), oldValue.slice(0, this.numColors))){
                    this.ditherImageWithSelectedAlgorithm();
                }
                let currentPalette = this.palettes[this.selectedPaletteIndex];
                //set palette to custom if a color is changed
                if(!currentPalette.isCustom && !ColorPicker.areColorArraysIdentical(this.colors, currentPalette.colors)){
                    this.selectedPaletteIndex = 0;
                }
            },
            selectedPaletteIndex: function(newValue){
                let palette = this.palettes[newValue];
                if(!palette.isCustom){
                    this.colorsShadow = palette.colors.slice();
                }
            },
            selectedColorDitherModeId: function(newValue){
                if(this.isImageLoaded && this.isLivePreviewEnabled){
                    this.ditherImageWithSelectedAlgorithm();
                }
            },
        },
        methods: {
            imageLoaded: function(loadedImage, loadedWebglTexture){
                this.loadedImage = loadedImage;
                this.hasImageBeenTransformed = false;
                sourceWebglTexture = loadedWebglTexture;
                
                //draw histogram
                this.$emit('request-worker', (worker)=>{
                    worker.postMessage(WorkerUtil.colorHistogramWorkerHeader());
                });
                
                if(this.isLivePreviewEnabled){
                    this.ditherImageWithSelectedAlgorithm();   
                }
                else{
                    //if live preview is not enabled, transform canvas will be blank unless we do this
                    this.$emit('display-transformed-image');
                }
            },
            ditherImageWithSelectedAlgorithm: function(){
                if(!this.isImageLoaded){
                    return;
                }
                if(this.isSelectedAlgorithmWebGl){
                    this.hasImageBeenTransformed = true;
                    Timer.megapixelsPerSecond(this.selectedDitherAlgorithm.title + ' webgl', this.loadedImage.width * this.loadedImage.height, ()=>{
                        this.selectedDitherAlgorithm.webGlFunc(this.transformCanvasWebGl.gl, sourceWebglTexture, this.loadedImage.width, this.loadedImage.height, this.selectedColorDitherModeId, this.selectedColorsVec, this.numColors); 
                    });
                    //have to copy to 2d context, since chrome will clear webgl context after switching tabs
                    //https://stackoverflow.com/questions/44769093/how-do-i-prevent-chrome-from-disposing-of-my-webgl-drawing-context-after-swit
                    this.transformCanvas.context.drawImage(this.transformCanvasWebGl.canvas, 0, 0);
                    this.$emit('display-transformed-image');
                    return;
                }
                this.$emit('request-worker', (worker)=>{
                    webworkerStartTime = Timer.timeInMilliseconds();
                    worker.postMessage(WorkerUtil.ditherWorkerHeader(this.loadedImage.width, this.loadedImage.height, this.threshold, this.selectedDitherAlgorithm.id, this.colorReplaceBlackPixel, this.colorReplaceWhitePixel));
                });
            },
            ditherWorkerMessageReceivedDispatcher: function(messageTypeId, pixels){
                switch(messageTypeId){
                    case WorkerHeaders.DITHER:
                        this.ditherWorkerMessageReceived(pixels);
                        break;
                    case WorkerHeaders.DITHER_BW:
                        this.ditherWorkerBwMessageReceived(pixels);
                        break;
                    //histogram
                    default:
                        this.histogramWorkerMessageReceived(pixels);
                        break;
                }
            },
            histogramWorkerMessageReceived: function(pixels){
                Canvas.replaceImageWithArray(histogramCanvas, this.histogramWidth, this.histogramHeight, pixels);
            },
            ditherWorkerMessageReceived: function(pixels){
                this.hasImageBeenTransformed = true;
                Canvas.replaceImageWithArray(this.transformCanvas, this.loadedImage.width, this.loadedImage.height, pixels);
                console.log(Timer.megapixelsMessage(this.selectedDitherAlgorithm.title + ' webworker', this.loadedImage.width * this.loadedImage.height, (Timer.timeInMilliseconds() - webworkerStartTime) / 1000));
                this.$emit('display-transformed-image');
            },
            printPalette: function(){
                //used to simplify palette creation
                console.log(JSON.stringify(this.colors).replace(/"/g, '\'').replace(/,/g, ', '));
            },
            //drag functions based on: https://www.w3schools.com/html/html5_draganddrop.asp
            handleColorDragover: function(e, colorIndex){
                e.preventDefault();
                if(colorIndex !== undefined){
                    this.colorDrag.dragoverIndex = colorIndex;   
                }
            },
            handleColorDragstart: function(e, colorIndex){
                this.colorDrag.draggedIndex = colorIndex;
            },
            handleColorDrop: function(e, colorIndex){
                e.preventDefault();
                e.stopPropagation();
                this.colorDrag.droppedIndex = colorIndex;
            },
            //according to spec, must happen after drop
            handleColorDragend: function(e){
                let droppedOnContainer = this.colorDrag.droppedIndex === undefined;
                let swapIndex = this.colorDrag.dragoverIndex;
                //if dropped on container, it means we want swap with last visible item
                if(droppedOnContainer){
                    swapIndex = this.numColors - 1;
                }
                let colorsCopy = null;
                if(this.colorDrag.draggedIndex != swapIndex){
                    colorsCopy = this.colorsShadow.slice();
                    let draggedColor = colorsCopy.splice(this.colorDrag.draggedIndex, 1)[0];
                    colorsCopy.splice(swapIndex, 0, draggedColor);
                }
                //reset drag indexes
                this.colorDrag.droppedIndex = null;
                this.colorDrag.dragoverIndex = null;
                this.colorDrag.draggedIndex = null;
                
                //draggedIndex has to be null before resetting colorsShadow
                if(colorsCopy){
                    this.colorsShadow = colorsCopy;
                }
            },
            isBeingDragged: function(colorIndex){
                return colorIndex === this.colorDrag.draggedIndex;
            },
            shouldShowDragoverStyle: function(colorIndex){
                return colorIndex === this.colorDrag.dragoverIndex && this.colorDrag.draggedIndex != colorIndex;
            },
            idForColorPicker: function(i){
                return `color_dither_colorpicker_${i}`;
            },
        }
    });
    
    
})(window.Vue, App.Canvas, App.Timer, App.Histogram, App.WorkerUtil, App.AlgorithmModel, App.Polyfills, App.WorkerHeaders, App.ColorPicker, App.ColorDitherModes);