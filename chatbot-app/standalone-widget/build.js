const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

async function build() {
  console.log('Building standalone chatbot widget...');
  
  // Read source file
  const srcPath = path.join(__dirname, 'src', 'chatbot-widget.js');
  const code = fs.readFileSync(srcPath, 'utf8');
  
  // Create dist directory
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
  }
  
  // Copy unminified version
  const distPath = path.join(distDir, 'chatbot-widget.js');
  fs.writeFileSync(distPath, code);
  console.log('✓ Created chatbot-widget.js');
  
  // Minify
  const result = await minify(code, {
    compress: {
      dead_code: true,
      drop_console: false,
      drop_debugger: true,
      keep_classnames: true,
      keep_fnames: true
    },
    mangle: {
      keep_classnames: true,
      keep_fnames: true
    },
    format: {
      comments: false
    }
  });
  
  // Write minified version
  const minPath = path.join(distDir, 'chatbot-widget.min.js');
  fs.writeFileSync(minPath, result.code);
  console.log('✓ Created chatbot-widget.min.js');
  
  // Get file sizes
  const originalSize = (fs.statSync(srcPath).size / 1024).toFixed(2);
  const minifiedSize = (fs.statSync(minPath).size / 1024).toFixed(2);
  
  console.log(`\nOriginal size: ${originalSize} KB`);
  console.log(`Minified size: ${minifiedSize} KB`);
  console.log(`Compression: ${((1 - minifiedSize / originalSize) * 100).toFixed(1)}%`);
  console.log('\n✅ Build complete!');
}

build().catch(console.error);
