'use strict';

// Literal requires so the Vercel file tracer packages these files and the
// glyph chunk they load. pdfkit 0.20.2 asks for them as #standard-fonts/*.
module.exports = {
  '#standard-fonts/Courier': require('./standard-fonts/Courier.cjs'),
  '#standard-fonts/CourierBold': require('./standard-fonts/CourierBold.cjs'),
  '#standard-fonts/CourierBoldOblique': require('./standard-fonts/CourierBoldOblique.cjs'),
  '#standard-fonts/CourierOblique': require('./standard-fonts/CourierOblique.cjs'),
  '#standard-fonts/Helvetica': require('./standard-fonts/Helvetica.cjs'),
  '#standard-fonts/HelveticaBold': require('./standard-fonts/HelveticaBold.cjs'),
  '#standard-fonts/HelveticaBoldOblique': require('./standard-fonts/HelveticaBoldOblique.cjs'),
  '#standard-fonts/HelveticaOblique': require('./standard-fonts/HelveticaOblique.cjs'),
  '#standard-fonts/Symbol': require('./standard-fonts/Symbol.cjs'),
  '#standard-fonts/TimesBold': require('./standard-fonts/TimesBold.cjs'),
  '#standard-fonts/TimesBoldItalic': require('./standard-fonts/TimesBoldItalic.cjs'),
  '#standard-fonts/TimesItalic': require('./standard-fonts/TimesItalic.cjs'),
  '#standard-fonts/TimesRoman': require('./standard-fonts/TimesRoman.cjs'),
  '#standard-fonts/ZapfDingbats': require('./standard-fonts/ZapfDingbats.cjs'),
};
