import * as XLSX from 'xlsx'
import { getWorkers, getRecords } from './storage'

export function exportSalaryExcel(dateRange, periodLabel) {
  const workers = getWorkers()

  const rows = []
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

    const amount = hours * w.hourlyRate
    totalHours += hours
    totalAmount += amount

    rows.push({
      '序号': idx + 1,
      '姓名': w.name,
      '出勤天数': days.size,
      '工时(小时)': hours.toFixed(1),
      '时薪(元)': w.hourlyRate,
      '应发工资(元)': amount.toFixed(0)
    })
  })

  rows.push({
    '序号': '',
    '姓名': '合计',
    '出勤天数': '',
    '工时(小时)': totalHours.toFixed(1),
    '时薪(元)': '',
    '应发工资(元)': totalAmount.toFixed(0)
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '工资表')

  const filename = `工资表_${periodLabel.replace(/[年月日\s—]+/g, '_')}.xlsx`
  XLSX.writeFile(wb, filename)
}