import ArrayUtil from "../shared/array-util.js";

/**
 * Note that color hex codes must be in 6 digit format, and not 3 digit format to work properly
 */
function defaultPalettes() {
  return [
    {
      title: "Flayer",
      colors: [
        "#131313",
        "#F4F5EC",
        "#4BA5F2",
        "#EB88EF",
        "#EFBC41",
        "#E7692C",
      ],
    },
  ];
}

function getPalettes(minimumColorsLength) {
  return padPaletteColorsToMinimumLength(
    defaultPalettes(),
    minimumColorsLength
  );
}

//make sure each palette has at least the minimum number of colors
function padPaletteColorsToMinimumLength(palettes, minimumColorsLength) {
  return palettes.map((palette) => {
    if (!palette.isCustom && palette.colors.length < minimumColorsLength) {
      palette.colors = palette.colors.concat(
        ArrayUtil.create(minimumColorsLength - palette.colors.length, () => {
          return "#000000";
        })
      );
    }
    return palette;
  });
}

function generateUserSavedPaletteTitle(savedPaletteId) {
  return `Saved Palette ${savedPaletteId}`;
}

function generateUserSavedPalette(colors, savedPaletteId) {
  return {
    title: generateUserSavedPaletteTitle(savedPaletteId),
    colors: colors,
    isSaved: true,
  };
}

export default {
  get: getPalettes,
  generateUserSavedPalette,
  padPaletteColorsToMinimumLength,
};
