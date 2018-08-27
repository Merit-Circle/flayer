PHP_BUILD_MODE=debug

PUBLIC_HTML_DIR=public_html
HTML_INDEX=$(PUBLIC_HTML_DIR)/index.html

#js source files
JS_SRC != find ./js_src/app -type f -name '*.js'

#php source
PHP_MODELS != find ./inc/models -type f -name '*.php'
PHP_JS_FILES_LIST=./inc/models/js-files.php
PHP_TEMPLATES != find ./templates/index -type f -name '*.php'
PHP_CONFIG=inc/config.php
PHP_DITHER_ALGORITHM_MODEL=inc/models/algorithm-model.php
PHP_COLOR_QUANTIZATION_MODES=inc/models/color-quantization-modes.php

#JS source php builders
JS_APP_TEMPLATE=templates/app.js.php
JS_WORKER_TEMPLATE=templates/worker.js.php

#JS output files
JS_WEBPACK_CONFIG=webpack.config.js
JS_WEBPACK_RELEASE_CONFIG=webpack.production.config.js
JS_OUTPUT_DIR=$(PUBLIC_HTML_DIR)/js
JS_BUNDLE_OUTPUT=$(JS_OUTPUT_DIR)/bundle.js
JS_BUNDLE_OUTPUT_RELEASE=$(JS_OUTPUT_DIR)/bundle.min.js


#JS generated modules
JS_GENERATED_SRC_DIR=js_generated
JS_GENERATED_OUTPUT_DIR=js_src/generated_output

JS_GENERATED_APP_CONSTANTS_SRC=$(JS_GENERATED_SRC_DIR)/app/constants.js.php
JS_GENERATED_APP_CONSTANTS_OUTPUT=$(JS_GENERATED_OUTPUT_DIR)/app/constants.js

JS_GENERATED_APP_ALGORITHM_MODEL_SRC=$(JS_GENERATED_SRC_DIR)/app/algorithm-model.js.php
JS_GENERATED_APP_ALGORITHM_MODEL_OUTPUT=$(JS_GENERATED_OUTPUT_DIR)/app/algorithm-model.js

JS_GENERATED_APP_COLOR_QUANTIZATION_MODES_SRC=$(JS_GENERATED_SRC_DIR)/app/color-quantization-modes.js.php
JS_GENERATED_APP_COLOR_QUANTIZATION_MODES_OUTPUT=$(JS_GENERATED_OUTPUT_DIR)/app/color-quantization-modes.js

JS_GENERATED_WORKER_ALGORITHM_MODEL_SRC=$(JS_GENERATED_SRC_DIR)/worker/algorithm-model.js.php
JS_GENERATED_WORKER_ALGORITHM_MODEL_OUTPUT=$(JS_GENERATED_OUTPUT_DIR)/worker/algorithm-model.js

JS_GENERATED_WORKER_COLOR_QUANTIZATION_MODES_SRC=$(JS_GENERATED_SRC_DIR)/worker/color-quantization-modes.js.php
JS_GENERATED_WORKER_COLOR_QUANTIZATION_MODES_OUTPUT=$(JS_GENERATED_OUTPUT_DIR)/worker/color-quantization-modes.js

#css
SASS_SRC != find ./sass -type f -name '*.scss'
CSS_OUTPUT=$(PUBLIC_HTML_DIR)/styles/style.css


# all: $(JS_APP_OUTPUT) $(CSS_OUTPUT) $(VUE_OUTPUT) $(JS_WORKER_OUTPUT) $(HTML_INDEX) $(JS_GENERATED_APP_CONSTANTS_OUTPUT) $(JS_GENERATED_APP_ALGORITHM_MODEL_OUTPUT) $(JS_GENERATED_APP_COLOR_QUANTIZATION_MODES_OUTPUT) $(JS_GENERATED_WORKER_ALGORITHM_MODEL_OUTPUT) $(JS_GENERATED_WORKER_COLOR_QUANTIZATION_MODES_OUTPUT)

all: $(CSS_OUTPUT) $(JS_BUNDLE_OUTPUT) $(HTML_INDEX) $(JS_GENERATED_APP_CONSTANTS_OUTPUT) $(JS_GENERATED_APP_ALGORITHM_MODEL_OUTPUT) $(JS_GENERATED_APP_COLOR_QUANTIZATION_MODES_OUTPUT) $(JS_GENERATED_WORKER_ALGORITHM_MODEL_OUTPUT) $(JS_GENERATED_WORKER_COLOR_QUANTIZATION_MODES_OUTPUT)

#used when changing between PHP_BUILD_MODES
reset:
	rm $(HTML_INDEX)
	rm -f $(JS_GENERATED_APP_CONSTANTS_OUTPUT) 
	rm -f $(JS_GENERATED_APP_ALGORITHM_MODEL_OUTPUT) 
	rm -f $(JS_GENERATED_APP_COLOR_QUANTIZATION_MODES_OUTPUT)
	rm -f $(JS_GENERATED_WORKER_ALGORITHM_MODEL_OUTPUT) 
	rm -f $(JS_GENERATED_WORKER_COLOR_QUANTIZATION_MODES_OUTPUT)

#target specific variable
release: PHP_BUILD_MODE=release
release: $(HTML_INDEX) $(CSS_OUTPUT) $(JS_BUNDLE_OUTPUT_RELEASE)

unsplash_api:
	php scripts/unsplash-random-images.php > $(PUBLIC_HTML_DIR)/api/unsplash.json

###### PHP generated JS

$(JS_GENERATED_APP_CONSTANTS_OUTPUT): $(JS_GENERATED_APP_CONSTANTS_SRC) $(PHP_CONFIG)
	php $(JS_GENERATED_APP_CONSTANTS_SRC) > $(JS_GENERATED_APP_CONSTANTS_OUTPUT)

$(JS_GENERATED_APP_ALGORITHM_MODEL_OUTPUT): $(JS_GENERATED_APP_ALGORITHM_MODEL_SRC) $(PHP_CONFIG) $(PHP_DITHER_ALGORITHM_MODEL)
	php $(JS_GENERATED_APP_ALGORITHM_MODEL_SRC) > $(JS_GENERATED_APP_ALGORITHM_MODEL_OUTPUT)

$(JS_GENERATED_APP_COLOR_QUANTIZATION_MODES_OUTPUT): $(JS_GENERATED_APP_COLOR_QUANTIZATION_MODES_SRC) $(PHP_CONFIG) $(PHP_COLOR_QUANTIZATION_MODES)
	php $(JS_GENERATED_APP_COLOR_QUANTIZATION_MODES_SRC) > $(JS_GENERATED_APP_COLOR_QUANTIZATION_MODES_OUTPUT)

$(JS_GENERATED_WORKER_ALGORITHM_MODEL_OUTPUT): $(JS_GENERATED_WORKER_ALGORITHM_MODEL_SRC) $(PHP_CONFIG) $(PHP_DITHER_ALGORITHM_MODEL)
	php $(JS_GENERATED_WORKER_ALGORITHM_MODEL_SRC) > $(JS_GENERATED_WORKER_ALGORITHM_MODEL_OUTPUT)

$(JS_GENERATED_WORKER_COLOR_QUANTIZATION_MODES_OUTPUT): $(JS_GENERATED_WORKER_COLOR_QUANTIZATION_MODES_SRC) $(PHP_CONFIG) $(PHP_COLOR_QUANTIZATION_MODES)
	php $(JS_GENERATED_WORKER_COLOR_QUANTIZATION_MODES_SRC) > $(JS_GENERATED_WORKER_COLOR_QUANTIZATION_MODES_OUTPUT)

###### JS

$(JS_BUNDLE_OUTPUT): $(JS_SRC) $(JS_WEBPACK_CONFIG)
	npm run webpack:dev 

$(JS_BUNDLE_OUTPUT_RELEASE): $(JS_SRC) $(JS_WEBPACK_RELEASE_CONFIG)
	npm run webpack:prod

#have to touch CSS_OUTPUT, because gulp uses src modified time, instead of the time now
#https://github.com/gulpjs/gulp/issues/1461
$(CSS_OUTPUT): $(SASS_SRC)
	npm run gulp
	touch $(CSS_OUTPUT)

$(HTML_INDEX): $(PHP_TEMPLATES) $(PHP_CONFIG) $(PHP_JS_FILES_LIST)
	php templates/index/index.php $(PHP_BUILD_MODE) > $(HTML_INDEX)