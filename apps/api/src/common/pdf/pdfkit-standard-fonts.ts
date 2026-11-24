import Module from 'module';

/**
 * pdfkit loads Helvetica with createRequire('#standard-fonts/Helvetica').
 * Node resolves that inside the pdfkit package, and Vercel does not copy
 * those files, so every PDF throws. These copies are the pdfkit 0.20.2
 * standard fonts. Hand them back from createRequire before pdfkit is loaded.
 * A missing copy must not stop the API from starting.
 */
const PATCH_KEY = Symbol.for('campusops.pdfkit-standard-fonts');
const moduleApi = Module as typeof Module & Record<symbol, boolean>;

type StandardFontData = { name: string };

let fontData: Record<string, StandardFontData> = {};
try {
  fontData = require('./pdfkit-font-data.cjs') as Record<string, StandardFontData>;
} catch (error) {
  console.error('pdfkit standard fonts were not packaged', error);
}

if (!moduleApi[PATCH_KEY] && fontData['#standard-fonts/Helvetica']) {
  const createRequire = Module.createRequire;
  Module.createRequire = function createRequireWithPdfKitFonts(filename: string) {
    const created = createRequire.call(Module, filename);
    const wrapped = ((request: string) => {
      if (typeof request === 'string' && Object.prototype.hasOwnProperty.call(fontData, request)) {
        return fontData[request];
      }
      return created(request);
    }) as NodeRequire;
    wrapped.resolve = created.resolve.bind(created);
    wrapped.cache = created.cache;
    wrapped.extensions = created.extensions;
    wrapped.main = created.main;
    return wrapped;
  } as typeof Module.createRequire;
  moduleApi[PATCH_KEY] = true;
}
