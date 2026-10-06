export default {
  plugins: [{
    name: 'version-file',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.txt', source: 'OUTLET CAQUETA STORE - V9 Mi cuenta (archivos en raiz)\n' });
    }
  }]
};
