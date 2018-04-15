<?php
    require_once('inc'.DIRECTORY_SEPARATOR.'config.php');
    require_once(VIEWS_PATH.'index-view.php');
?>

<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8"/>
        <title><?= APP_NAME; ?></title>
        <meta name="description" content="An interactive exploration of image dithering algorithms"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="stylesheet" type="text/css" href="/styles/style.css"/>
        <!-- Place favicon.ico and apple-touch-icon.png in the root directory -->
    </head>
    <body>
        <header class="header">
            <div>
                <h1 class="brand"><?= APP_NAME; ?></h1>
            </div>
        </header>
        <main>
            <div id="app">
                <dither-studio/>
            </div>
        </main>
        <script type="vue/template" id="dither-studio-component">
            <?php require(TEMPLATES_VUE_COMPONENTS_PATH.'dither-studio-component.php'); ?>
        </script>
        <script type="vue/template" id="bw-dither-component">
            <?php require(TEMPLATES_VUE_COMPONENTS_PATH.'bw-dither-component.php'); ?>
        </script>
        <script type="vue/template" id="color-dither-component">
            <?php require(TEMPLATES_VUE_COMPONENTS_PATH.'color-dither-component.php'); ?>
        </script>
        <script type="vue/template" id="modal-prompt-component">
            <?php require(TEMPLATES_VUE_COMPONENTS_PATH.'modal-prompt-component.php'); ?>
        </script>
        <?php require(TEMPLATES_WEBGL_SHADERS_PATH.'vertex-shaders.php'); ?>
        <?php require(TEMPLATES_WEBGL_SHADERS_PATH.'hsl-functions.php'); ?>
        <?php require(TEMPLATES_WEBGL_SHADERS_PATH.'arithmetic-dither-functions.php'); ?>
        <?php require(TEMPLATES_WEBGL_SHADERS_PATH.'pixel-distance-functions.php'); ?>
        <?php require(TEMPLATES_WEBGL_SHADERS_PATH.'fragment-shaders-bw-dither.php'); ?>
        <?php require(TEMPLATES_WEBGL_SHADERS_PATH.'fragment-shaders-color-dither.php'); ?>
        <script type="text/javascript" src="/js/vue.min.js"></script>
        <script type="text/javascript" src="<?= JS_APP_URL; ?>"></script>
    </body>
</html>