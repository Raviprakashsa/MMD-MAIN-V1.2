declare module 'exceljs/dist/exceljs.min.js' {
  import type * as ExcelJS from 'exceljs'

  const ExcelJsBrowserBundle: typeof ExcelJS
  export default ExcelJsBrowserBundle
}
