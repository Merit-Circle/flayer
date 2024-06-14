<?php

class DitherAlgorithm {
    protected $id = null;
    protected $name;
    protected $workerFunc;
    protected $webglFunc;
    protected $appOptions;


    //appOptions is addition key-values to add to App algorithm model
    //currently only works with boolean and number values
    function __construct(string $name, string $workerFunc, string $webglFunc, array $appOptions=[]){
        $this->name = $name;
        $this->workerFunc = $workerFunc;
        $this->webglFunc = $webglFunc;
        $this->appOptions = $appOptions;
    }

    public function name(): string{
        return $this->name;
    }

    public function workerFunc(): string{
        return $this->workerFunc;
    }

    public function webglFunc(): string{
        return $this->webglFunc;
    }

    public function id(): int{
        return $this->id;
    }

    public function appOptions(): array{
        return $this->appOptions;
    }

    public function setId(int $id){
        if(!is_null($this->id)){
            $error = "id for {${$this->name}} has already been assigned and cannot be changed";
            throw new Exception($error);
        }
        $this->id = $id;
    }
}

/**
 * Ordered Matrix Patters
 */

class OrderedMatrixPattern {
    protected $jsFuncName;
    protected $dimensions;
    protected $addDimensionsToTitle;

    function __construct(string $jsFuncName, int $dimensions, bool $addDimensionsToTitle=false){
        $this->jsFuncName = $jsFuncName;
        $this->dimensions = $dimensions;
        $this->addDimensionsToTitle = $addDimensionsToTitle;
    }

    public function jsFuncName(): string{
        return $this->jsFuncName;
    }

    public function dimensions(): int{
        return $this->dimensions;
    }

    public function addDimensionsToTitle(): bool{
        return $this->addDimensionsToTitle;
    }
}

function getOrderedMatrixPatterns(): array{
    return [
        'SQUARE_4' => new OrderedMatrixPattern('square', 4, true),
    ];
}

/**
 * Helper functions to create dither algorithms
 */
function dimensionsSuffix(int $dimensions): string{
    return "{$dimensions}×{$dimensions}";
}
function bayerTitle(string $titlePrefix, int $dimensions, string $suffix=''): string{
    $dimensionsSuffix = dimensionsSuffix($dimensions);
    return "{$titlePrefix} {$dimensionsSuffix}{$suffix}";
}
function orderedMatrixTitle(string $titlePrefix, string $orderedMatrixName, int $dimensions, bool $isRandom=false, bool $addDimensionsToTitle=false): string{
    $randomIndicatorSuffix = $isRandom ? ' (R)' : '';
    if($orderedMatrixName === 'bayer' && !empty($titlePrefix)){
        return bayerTitle($titlePrefix, $dimensions, $randomIndicatorSuffix);
    }
    $matrixTitle = titleizeCamelCase($orderedMatrixName);
    if(!empty($titlePrefix)){
        $dimensionsSuffix = $addDimensionsToTitle ? ' '.dimensionsSuffix($dimensions) : '';    
        return "{$titlePrefix} {$matrixTitle}{$dimensionsSuffix}{$randomIndicatorSuffix}";
    }
    $dimensionsSuffix = $addDimensionsToTitle ? dimensionsSuffix($dimensions).' ' : '';
    return "{$matrixTitle} {$dimensionsSuffix}{$randomIndicatorSuffix}";
}
function titleizeCamelCase(string $camelCase): string{
    $isFirstLetter = true;
    $ret = '';
    foreach(str_split($camelCase) as $char){
        if($isFirstLetter){
            $ret = strtoupper($char);
            $isFirstLetter = false;
        }
        else if(ctype_upper($char)){
            $ret = $ret.' '.$char;
        }
        else{
            $ret .= $char;
        }
    }

    return $ret;
}
/**
 * Yliluoma Dithers
 */
function yliluoma1BuilderBase(string $orderedMatrixName, int $dimensions, bool $addDimensionsToTitle=false): DitherAlgorithm{
    $titlePrefix = 'Yliluoma 1';
    $title = orderedMatrixTitle($titlePrefix, $orderedMatrixName, $dimensions, false, $addDimensionsToTitle);
    $webworkerFunc = "OrderedDither.createYliluoma1ColorDither({$dimensions}, '{$orderedMatrixName}')";
    $webglFunc = "ColorDither.createYliluoma1OrderedDither({$dimensions}, '{$orderedMatrixName}')";
    return new DitherAlgorithm($title, $webworkerFunc, $webglFunc);
}
function yliluoma1Builder(OrderedMatrixPattern $pattern): DitherAlgorithm{
    return yliluoma1BuilderBase($pattern->jsFuncName(), $pattern->dimensions(), $pattern->addDimensionsToTitle());
}
function yliluoma2BuilderBase(string $orderedMatrixName, int $dimensions, bool $addDimensionsToTitle=false): DitherAlgorithm{
    $titlePrefix = 'Yliluoma 2';
    $title = orderedMatrixTitle($titlePrefix, $orderedMatrixName, $dimensions, false, $addDimensionsToTitle);
    $webworkerFunc = "OrderedDither.createYliluoma2ColorDither({$dimensions}, '{$orderedMatrixName}')";
    $webglFunc = "ColorDither.createYliluoma2OrderedDither({$dimensions}, '{$orderedMatrixName}')";
    return new DitherAlgorithm($title, $webworkerFunc, $webglFunc);
}
function yliluoma2Builder(OrderedMatrixPattern $pattern): DitherAlgorithm{
    return yliluoma2BuilderBase($pattern->jsFuncName(), $pattern->dimensions(), $pattern->addDimensionsToTitle());
}

/**
 * Stark Ordered Dither 
 */
function starkOrderedDitherBuilderBase(string $orderedMatrixName, int $dimensions, bool $addDimensionsToTitle=false): DitherAlgorithm{
    $titlePrefix = 'Stark';
    $title = orderedMatrixTitle($titlePrefix, $orderedMatrixName, $dimensions, false, $addDimensionsToTitle);
    // $webworkerFunc = "OrderedDither.createYliluoma1ColorDither({$dimensions}, '{$orderedMatrixName}')";
    $webworkerFunc = "OrderedDither.createStarkColorOrderedDither({$dimensions}, '{$orderedMatrixName}')";
    $webglFunc = "ColorDither.createStarkOrderedDither({$dimensions}, '{$orderedMatrixName}')";
    return new DitherAlgorithm($title, $webworkerFunc, $webglFunc);
}
function starkOrderedDitherBuilder(OrderedMatrixPattern $pattern): DitherAlgorithm{
    return starkOrderedDitherBuilderBase($pattern->jsFuncName(), $pattern->dimensions(), $pattern->addDimensionsToTitle());
}

/**
 * Hue Lightness
 */
function hueLightnessBuilderBase(string $orderedMatrixName, int $dimensions, bool $isRandom=false, bool $addDimensionsToTitle=false): DitherAlgorithm{
    $titlePrefix = 'Hue-Lightness';
    $title = orderedMatrixTitle($titlePrefix, $orderedMatrixName, $dimensions, $isRandom, $addDimensionsToTitle);
    $randomArg = $isRandom ? ', true' : '';
    $webworkerFunc = "OrderedDither.createHueLightnessDither('{$orderedMatrixName}',{$dimensions}{$randomArg})";
    $webglFunc = "ColorDither.createHueLightnessOrderedDither({$dimensions},'{$orderedMatrixName}'{$randomArg})";
    return new DitherAlgorithm($title, $webworkerFunc, $webglFunc);
}
function hueLightnessBuilder(OrderedMatrixPattern $pattern): DitherAlgorithm{
    return hueLightnessBuilderBase($pattern->jsFuncName(), $pattern->dimensions(), false, $pattern->addDimensionsToTitle());
}
function hueLightnessRandomBuilder(OrderedMatrixPattern $pattern): DitherAlgorithm{
    return hueLightnessBuilderBase($pattern->jsFuncName(), $pattern->dimensions(), true, $pattern->addDimensionsToTitle());
}
/**
 * Vanilla Bw ordered dither 
 */
function orderedDitherBwBuilderBase(string $orderedMatrixName, int $dimensions, bool $isRandom=false, bool $addDimensionsToTitle=false): DitherAlgorithm{
    $titlePrefix = '';
    $title = orderedMatrixTitle($titlePrefix, $orderedMatrixName, $dimensions, $isRandom, $addDimensionsToTitle);
    $pascalCase = ucfirst($orderedMatrixName);
    $randomArg = $isRandom ? ', true' : '';
    $webworkerFunc = "OrderedDither.create{$pascalCase}Dither({$dimensions}{$randomArg})";
    $webglFunc = "BwDither.create{$pascalCase}Dither({$dimensions}{$randomArg})";
    return new DitherAlgorithm($title, $webworkerFunc, $webglFunc);
}
function orderedDitherBwBuilder(OrderedMatrixPattern $pattern): DitherAlgorithm{
    return orderedDitherBwBuilderBase($pattern->jsFuncName(), $pattern->dimensions(), false, $pattern->addDimensionsToTitle());
}
function orderedDitherBwRandomBuilder(OrderedMatrixPattern $pattern): DitherAlgorithm{
    return orderedDitherBwBuilderBase($pattern->jsFuncName(), $pattern->dimensions(), true, $pattern->addDimensionsToTitle());
}
/**
 * Vanilla Color ordered dither 
 */
function orderedDitherColorBuilderBase(string $orderedMatrixName, int $dimensions, bool $isRandom=false, bool $addDimensionsToTitle=false): DitherAlgorithm{
    $titlePrefix = '';
    $title = orderedMatrixTitle($titlePrefix, $orderedMatrixName, $dimensions, $isRandom, $addDimensionsToTitle);
    $pascalCase = ucfirst($orderedMatrixName);
    $randomArg = $isRandom ? ', true' : '';
    $webworkerFunc = "OrderedDither.create{$pascalCase}ColorDither({$dimensions}{$randomArg})";
    $webglFunc = "ColorDither.create{$pascalCase}ColorDither({$dimensions}{$randomArg})";
    return new DitherAlgorithm($title, $webworkerFunc, $webglFunc);
}
function orderedDitherColorBuilder(OrderedMatrixPattern $pattern): DitherAlgorithm{
    return orderedDitherColorBuilderBase($pattern->jsFuncName(), $pattern->dimensions(), false, $pattern->addDimensionsToTitle());
}
function orderedDitherColorRandomBuilder(OrderedMatrixPattern $pattern): DitherAlgorithm{
    return orderedDitherColorBuilderBase($pattern->jsFuncName(), $pattern->dimensions(), true, $pattern->addDimensionsToTitle());
}
/**
 * Error prop dither
 */
function errorPropBwDitherBuilder(string $funcName, string $title=''): DitherAlgorithm{
    $title = !empty($title) ? $title : titleizeCamelCase($funcName);
    return new DitherAlgorithm($title, "ErrorPropDither.{$funcName}", '');
}
function errorPropColorDitherBuilder(string $funcName, string $title=''): DitherAlgorithm{
    $title = !empty($title) ? $title : titleizeCamelCase($funcName);
    return new DitherAlgorithm($title, "ErrorPropColorDither.{$funcName}", '');
}
/**
 * Arithmetic dither
 */
function arithmeticDitherBwBuilder(string $titleSuffix, string $funcNameSuffix): DitherAlgorithm{
    $title = "Adither {$titleSuffix}";
    $webworkerFunc = "Threshold.adither{$funcNameSuffix}";
    $webglFunc = "BwDither.aDither{$funcNameSuffix}";

    return new DitherAlgorithm($title, $webworkerFunc, $webglFunc, ['requiresHighPrecisionInt' => 'true']);
}

function arithmeticDitherColorBuilder(string $titleSuffix, string $funcNameSuffix): DitherAlgorithm{
    $title = "Adither {$titleSuffix}";
    $webworkerFunc = "Threshold.adither{$funcNameSuffix}Color";
    $webglFunc = "ColorDither.aDither{$funcNameSuffix}";
    
    return new DitherAlgorithm($title, $webworkerFunc, $webglFunc, ['requiresHighPrecisionInt' => 'true']);
}

/**
* Functions for opt-groups
*/
function getAlgorithmGroups(array $model): array{
    $ret = [];

    $groupStartIndex = 0;
    foreach($model as $item){
        if(gettype($item) === 'string'){
            $ret[] = [
                'title' => $item,
                'start' => $groupStartIndex,
            ];
        }
        else{
            $groupStartIndex++;
        }
    }
    $groupListLength = count($ret);

    for($i=0;$i<$groupListLength-1;$i++){
        $item = &$ret[$i];
        $item['length'] = $ret[$i+1]['start'] - $item['start'];
    }
    $algoModelLength = count($model) - $groupListLength;
    $lastItem = &$ret[$groupListLength - 1];
    $lastItem['length'] =  $algoModelLength - $lastItem['start'];

    return $ret;
}

function bwAlgoGroups(): string{
    return json_encode(getAlgorithmGroups(bwAlgorithmModelBase()));
}

function colorAlgoGroups(): string{
    return json_encode(getAlgorithmGroups(colorAlgorithmModelBase()));
}

/**
* Base arrays for algorithms and opt-groups
*/
function bwAlgorithmModelBase(): array{
    $ret = [];

    return array_merge($ret, bwOrderedDitherAlgorithmModel());
}

function colorAlgorithmModelBase(): array{
    $ret = [];
    return array_merge($ret, colorOrderedDitherAlgorithmModel());
}

function colorOrderedDitherAlgorithmModel(): array{
    $patterns = getOrderedMatrixPatterns();
    //if using patterns greater than dimension 8 with yliluoma 1,
    //make sure to increase YLILUOMA_1_ORDERED_MATRIX_MAX_LENGTH constant in config.php
    $yliluoma1PatternKeys = [];
    $yliluoma2PatternKeys = [];
    $ret = [];
    
    foreach($patterns as $patternKey => $patternValue){
        $subArray = [orderedMatrixTitle('', $patternValue->jsFuncName(), $patternValue->dimensions(), false, $patternValue->addDimensionsToTitle())];

        $subArray[] = orderedDitherColorBuilder($patternValue);
        $subArray[] = orderedDitherColorRandomBuilder($patternValue);
        $subArray[] = starkOrderedDitherBuilder($patternValue);
        $subArray[] = hueLightnessBuilder($patternValue);
        $subArray[] = hueLightnessRandomBuilder($patternValue);
        if(array_key_exists($patternKey, $yliluoma1PatternKeys)){
            $subArray[] = yliluoma1Builder($patternValue);
        }
        if(array_key_exists($patternKey, $yliluoma2PatternKeys)){
            $subArray[] = yliluoma2Builder($patternValue);
        }

        $ret = array_merge($ret, $subArray);
    }

    return $ret;
}

function bwOrderedDitherAlgorithmModel(): array{
    $patterns = getOrderedMatrixPatterns();
    $ret = [];
    
    foreach($patterns as $patternKey => $patternValue){
        $subArray = [orderedMatrixTitle('', $patternValue->jsFuncName(), $patternValue->dimensions(), false, $patternValue->addDimensionsToTitle())];

        $subArray[] = orderedDitherBwBuilder($patternValue);
        $subArray[] = orderedDitherBwRandomBuilder($patternValue);

        $ret = array_merge($ret, $subArray);
    }

    return $ret;
}

/**
* Algorithm model list functions
*/
function isDitherAlgorithm($item): bool{
    return gettype($item) === 'object';
}

function bwAlgorithmModel(): array{
    $model = array_filter(bwAlgorithmModelBase(), 'isDitherAlgorithm');

    return array_map(function($algoModel, $i){
        $algoModel->setId($i);
        return $algoModel;
        //have to use range instead of array_keys, since it will be indexes with optgroups
    }, $model, range(1, count($model)));
}

function colorAlgorithmModel(): array{
    $idOffset = count(bwAlgorithmModel());
    $model = array_filter(colorAlgorithmModelBase(), 'isDitherAlgorithm');

    return array_map(function($algoModel, $i){
        $algoModel->setId($i);
        return $algoModel;
    //have to use range instead of array_keys, since it will be indexes with optgroups
    }, $model, range($idOffset + 1, $idOffset + count($model)));
}


function printAppAlgoModel(array $algoModel){
    foreach($algoModel as $algorithm): ?>
			{
				title: '<?= $algorithm->name(); ?>',
				id: <?= $algorithm->id(); ?>,
				<?php if($algorithm->webGlFunc() !== ''): ?>
					webGlFunc: <?= $algorithm->webGlFunc(); ?>,
				<?php endif; ?>
                <?php if(!empty($algorithm->appOptions())): 
                    foreach($algorithm->appOptions() as $key => $value):
                        echo "$key: $value";
                    endforeach; 
                endif; ?>
			},
		<?php endforeach;
}