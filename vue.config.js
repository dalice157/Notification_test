module.exports = {
  // 基本路徑
  publicPath: process.env.NODE_ENV === 'production' ? '/memory-game/' : './',
  // 輸出檔案目錄
  outputDir: 'dist',
  assetsDir: 'assets', // 靜態資源目錄 (js, css, img, fonts)
  // eslint-loader 是否在儲存的時候檢查
  lintOnSave: true,
  // 生產環境是否生成 sourceMap 檔案
  productionSourceMap: false,
  // css相關配置 配置高於chainWebpack中關於css loader的配置
  css: {
    // 是否使用css分離外掛 ExtractTextPlugin
    extract: true,
    // 開啟 CSS source maps?是否在構建樣式地圖，false將提高構建速度
    sourceMap: false,
  },
};