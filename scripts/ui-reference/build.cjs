/* Deterministic B reference artifact. The inputs below remain the authority. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'client/reference');
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g,'\n'); }
const check=process.argv.includes('--check');
function write(file, text) {const normalized=text.replace(/\r\n/g,'\n'),target=path.join(out,file);if(check){if(fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n')!==normalized)throw Error('Stale reference artifact: '+file);}else fs.writeFileSync(target,normalized);}
function schemas() {
  const result = {}, context = { AEToolbox: { tools: {}, registerTool(s) { result[s.id] = s; } } };
  vm.createContext(context);
  for (const name of ['adComponentKit', 'registryControlLab']) vm.runInContext(read('host/tools/' + name + '.tool.jsx'), context);
  return { kit: result.ecommerceLayout, controls: result.registryControlLab };
}
function collect() {
  const c = { document: {} }; c.self = c; c.window = c; vm.createContext(c);
  for (const file of ['i18n.js', 'settingsSchema.js', 'appearance/appearanceParameterRegistry.js', 'appearance/appearanceResolver.js', 'designTuning/designTuningParameterRegistry.js', 'ui/motionDefaults.js']) vm.runInContext(read('client/js/' + file), c, { filename: file });
  const appearance = c.AppearanceParameterRegistry.list();
  const tuning = c.DesignTuningParameterRegistry.list();
  const css = read('client/css/style.css');
  const variables = Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*([^;\n]+);/g)].map(m => [m[1], m[2]]).reverse());
  const defaults = c.AppearanceResolver.create({registry:c.AppearanceParameterRegistry}).resolve();
  return { appearance, tuning, settings: c.window.AEToolboxSettingsSchema, dictionaries: c.window.I18n.dictionaries, defaults, variables, durations: c.window.MotionDefaults.durations };
}
async function build() {
  write('src/lab/registry-schema.js', '// Generated from current host schemas; never execute JSX in the browser.\nexport const REGISTRY_SCHEMAS=' + JSON.stringify(schemas(), null, 2) + ';\n');
  const data = collect();
  write('src/production-data.js', '// Generated from production parameter registries and i18n.\nexport const DATA=' + JSON.stringify(data) + ';\n');
  const result = await require('esbuild').build({entryPoints:[path.join(out,'src/app.js')], outfile:path.join(out,'reference.bundle.js'), bundle:true, format:'iife', target:['chrome99'], charset:'utf8', legalComments:'inline', metafile:true,write:false});
  write('reference.bundle.js',result.outputFiles[0].text);
  const inputs = Object.keys(result.metafile.inputs).map(p => p.replaceAll('\\','/'));
  if (inputs.some(p => /(?:velaRuntime|velaProviderController|velaExecutionAdapter|paletteStore\.js$)/.test(p) && !p.includes('/reference/'))) throw Error('Forbidden live command/storage dependency');
  const css = ['styles/styles.css','styles/registry.css','styles/palette.css','styles/curve.css','styles/color-picker.css','styles/reference.css','styles/controls.css'].map(p => read('client/reference/'+p)).join('\n');
  write('reference.css', css);
  // Opaque file iframes cannot fetch file subresources. Load a data-only script in
  // the parent, then give the sandbox a self-contained document with a script hash.
  const inlineScript=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
  const hash=require('node:crypto').createHash('sha256').update(inlineScript).digest('base64');
  const embedded='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'sha256-'+hash+'\'; style-src \'unsafe-inline\'; img-src data: blob:; connect-src \'none\'; object-src \'none\'; form-action \'none\'; base-uri \'none\'"><style>'+css+'</style></head><body><main id="reference-root" class="plugin"></main><script>'+inlineScript+'</script></body></html>';
  write('embedded.js','// Generated, data only; loaded lazily by the Developer launcher.\nObject.defineProperty(window,"UIReferenceArtifact",{configurable:true,value:'+JSON.stringify(embedded)+'});\n');
  console.log('Reference built for Chromium 99: '+inputs.length+' modules; no live command or storage owner.');
}
module.exports = { schemas, collect, build };
if (require.main === module) build().catch(e => { console.error(e); process.exitCode=1; });
