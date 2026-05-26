import { getWorkers, getRecords } from './storage'

export async function exportSalaryExcel(dateRange, periodLabel) {
  // 动态导入 exceljs，按需加载
  const ExcelJS = await import('exceljs')
  
  const workers = getWorkers()

  const workbook = new ExcelJS.Workbook()
  workbook.creator = '天天幸运考勤系统'
  
  const worksheet = workbook.addWorksheet('工资表')

  // 设置列
  worksheet.columns = [
    { header: '序号', key: 'index', width: 6 },
    { header: '姓名', key: 'name', width: 10 },
    { header: '计费方式', key: 'payType', width: 10 },
    { header: '出勤天数', key: 'days', width: 10 },
    { header: '工时(小时)', key: 'hours', width: 12 },
    { header: '费率(元)', key: 'rate', width: 10 },
    { header: '应发工资(元)', key: 'amount', width: 12 }
  ]

  // 设置表头样式
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).alignment = { horizontal: 'center' }

  let totalHours = 0, totalAmount = 0

  workers.forEach((w, idx) => {
    const records = getRecords({
      workerId: w.id,
      startDate: dateRange.start.getTime(),
      endDate: dateRange.end.getTime()
    })

    let hours = 0
    const days = new Set()

    records.forEach(r => {
      if (r.endTime) {
        hours += (r.endTime - r.startTime) / 1000 / 3600
        days.add(new Date(r.startTime).toDateString())
      }
    })

    const payType = w.payType || 'hourly'
    const rate = w.rate || w.hourlyRate || 10
    const amount = payType === 'daily' ? days.size * rate : hours * rate
    totalHours += hours
    totalAmount += amount

    worksheet.addRow({
      index: idx + 1,
      name: w.name,
      payType: payType === 'daily' ? '日薪' : '时薪',
      days: days.size,
      hours: Number(hours.toFixed(1)),
      rate: rate,
      amount: Number(amount.toFixed(0))
    })
  })

  // 添加合计行
  const totalRow = worksheet.addRow({
    index: '',
    name: '合计',
    payType: '',
    days: '',
    hours: Number(totalHours.toFixed(1)),
    rate: '',
    amount: Number(totalAmount.toFixed(0))
  })
  totalRow.font = { bold: true }

  // 生成文件并下载
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  
  const filename = `工资表_${periodLabel.replace(/[年月日\s—]+/g, '_')}.xlsx`
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  
  URL.revokeObjectURL(url)
}
