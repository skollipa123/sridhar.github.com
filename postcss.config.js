module.exports = {
  plugins: [
    require('autoprefixer'),
    require('@fullhuman/postcss-purgecss')({
      content: [
        './*.html',
        './*.js'
      ],
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
      safelist: [
        // Keep utility classes and animation classes
        /^(loaded|loading|notification|invalid|project-card|form-group)$/,
        /^(opacity|transform|transition)/,
        // Keep pseudo-classes and states
        /^(hover|focus|active|disabled)/,
        // Keep animation keyframes
        /^spin$/
      ]
    }),
    require('cssnano')({
      preset: ['default', {
        discardComments: {
          removeAll: true,
        },
        minifyFontValues: false,
        normalizeWhitespace: true,
        reduceIdents: false,
        zindex: false
      }]
    })
  ]
};