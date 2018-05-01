<?php

class ColorQuantizationMode {
    protected $key;
    protected $title;
    protected $algorithmName;
    protected $options;

    function __construct(string $key, string $title, string $algorithmName, array $options=[]) {
        $this->key = $key;
        $this->title = $title;
        $this->algorithmName = $algorithmName;
        $this->options = $options;
    }

    public function toArrayForApp(): array{
        return [
            'title' => $this->title,
        ];
    }

    public function toArrayForWorker(): array{
        $ret = [
            'key' => $this->key,
            'title' => $this->title,
            'algo' => $this->algorithmName,
        ];

        foreach($this->options as $key => $value){
            $ret[$key] = $value;
        }
        return $ret;
    }
}

function colorQuantizationModesBase(): array{
    return [
        'Perceptual Median Cut',
        new ColorQuantizationMode('PMC_BALANCED', 'Perceptual Median Cut (Balanced)', 'perceptualMedianCut', ['hueMix' => 1.6]),
        new ColorQuantizationMode('PMC_MEDIAN', 'Perceptual Median Cut (Monotone)', 'perceptualMedianCut', ['hueMix' => 2]),
        new ColorQuantizationMode('PMC_UNIFORM_VIBRANT', 'Perceptual Median Cut (Uniform Vibrant)', 'perceptualMedianCut', ['hueMix' => 0.6]),
        new ColorQuantizationMode('PMC_UNIFORM', 'Perceptual Median Cut (Uniform)', 'perceptualMedianCut', ['hueMix' => 0.6]),
        'Perceptual Uniform',
        new ColorQuantizationMode('UNIFORM', 'Perceptual Uniform', 'uniform'),
        new ColorQuantizationMode('UNIFORM_VIBRANT', 'Perceptual Uniform (Vibrant)', 'uniform'),
        'RGB Quant',
        new ColorQuantizationMode('RGB_QUANT', 'RGB Quant', 'rgbQuant', ['method' => 2]),
        new ColorQuantizationMode('RGB_QUANT_MANHATTAN', 'RGB Quant (Manhattan)', 'rgbQuant', ['colorDist' => 'manhattan','method' => 2]),
        new ColorQuantizationMode('RGB_QUANT_GLOBAL', 'RGB Quant (Global)', 'rgbQuant', ['method' => 1]),
        new ColorQuantizationMode('RGB_QUANT_MANHATTAN_GLOBAL', 'RGB Quant (Global Manhattan)', 'rgbQuant', ['colorDist' => 'manhattan','method' => 1]),
        'Spatial Popularity',
        new ColorQuantizationMode('SPATIAL_POPULARITY', 'Spatial Popularity (Horizontal)', 'popularity'),
        new ColorQuantizationMode('PERCEPTUAL_SPATIAL_POPULARITY', 'Perceptual Spatial Popularity (Horizontal)', 'popularity'),
        new ColorQuantizationMode('SPATIAL_POPULARITY_VERTICAL', 'Spatial Popularity (Vertical)', 'popularity'),
        new ColorQuantizationMode('PERCEPTUAL_SPATIAL_POPULARITY_VERTICAL', 'Perceptual Spatial Popularity (Vertical)', 'popularity'),
        new ColorQuantizationMode('LIGHTNESS_POPULARITY', 'Lightness Popularity', 'lightnessPopularity'),
        new ColorQuantizationMode('PERCEPTUAL_LIGHTNESS_POPULARITY', 'Perceptual Lightness Popularity', 'lightnessPopularity'),
        new ColorQuantizationMode('HUE_POPULARITY', 'Hue Popularity', 'huePopularity'),
        new ColorQuantizationMode('PERCEPTUAL_HUE_POPULARITY', 'Perceptual Hue Popularity', 'huePopularity'),
        'Median Cut',
        new ColorQuantizationMode('MEDIAN_CUT_AVERAGE', 'Median Cut (Average)', 'medianCut'),
        new ColorQuantizationMode('MEDIAN_CUT_MEDIAN', 'Median Cut (Median)', 'medianCut'),
    ];
}

function isColorQuantizationMode($item): bool{
    return gettype($item) === 'object';
}

function colorQuantizationModes(): array{
    //have to use array_values to reindex keys to make sequential array for json_encode to encode this properly as an array
    return array_values(array_filter(colorQuantizationModesBase(), 'isColorQuantizationMode'));
}

function colorQuantizationGroups(): array{
    $colorQuantizationModesBase = colorQuantizationModesBase();
    $groups = [];
    foreach($colorQuantizationModesBase as $index => $item){
        if(isColorQuantizationMode($item)){
            continue;
        }

        $groups[] = [
            'title' => $item,
            'start' => $index,
        ];
    }

    //need to normalize start indexes first
    $groups = array_map(function($group, $index){
        $group['start'] = $group['start'] - $index;
        return $group;
    }, $groups, array_keys($groups));


    $lastIndex = count($groups) - 1;
    $colorQuantizationModesBaseLength = count($colorQuantizationModesBase);

    return array_map(function($group, $index) use ($groups, $lastIndex, $colorQuantizationModesBaseLength){
        if($index === $lastIndex){
            $length = $colorQuantizationModesBaseLength - $group['start'] - 1;
        }
        else{
            $length = $groups[$index + 1]['start'] - $group['start'];
        }
        $group['length'] = $length;
        return $group;

    }, $groups, array_keys($groups));
}

function colorQuantizationModesApp(): array{
    return array_map(function($mode){
        return $mode->toArrayForApp();
    }, colorQuantizationModes());
}

function colorQuantizationModesWorker(): array{
    return array_map(function($mode){
        return $mode->toArrayForWorker();
    }, colorQuantizationModes());
}