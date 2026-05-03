import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { auth } from '@/lib/auth'
import { AppError } from '@/lib/core/app-error'
import { ExportService } from '@/lib/services/export.service'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''

  const headers = Object.keys(rows[0])
  const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    const raw = typeof value === 'object' ? JSON.stringify(value) : String(value)
    if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
      return `"${raw.replaceAll('"', '""')}"`
    }
    return raw
  }

  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCell(row[header])).join(','))
  }

  return lines.join('\n')
}

async function toXlsxBuffer(rows: Record<string, unknown>[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Export')

  if (rows.length > 0) {
    const headers = Object.keys(rows[0])
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.min(50, Math.max(12, header.length + 4)),
    }))

    for (const row of rows) {
      const normalized: Record<string, string> = {}
      for (const header of headers) {
        const value = row[header]
        normalized[header] = value === null || value === undefined
          ? ''
          : (typeof value === 'object' ? JSON.stringify(value) : String(value))
      }
      worksheet.addRow(normalized)
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return buffer as ArrayBuffer
}

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const payload = await ExportService.getDownloadPayload(
      { id: session.user.id, role: session.user.role },
      id
    )

    const job = payload.job as {
      _id: string
      format: 'CSV' | 'JSON' | 'XLSX'
      entityType: string
    }
    const rows = payload.rows
    const fileStamp = new Date().toISOString().slice(0, 10)
    const filePrefix = `${job.entityType.toLowerCase()}-${job._id}-${fileStamp}`

    if (job.format === 'JSON') {
      return new NextResponse(JSON.stringify(rows, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filePrefix}.json"`,
        },
      })
    }

    if (job.format === 'XLSX') {
      const buffer = await toXlsxBuffer(rows)
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filePrefix}.xlsx"`,
        },
      })
    }

    const csv = toCsv(rows)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filePrefix}.csv"`,
      },
    })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    return NextResponse.json(
      { error: 'Failed to prepare export download' },
      { status: 500 }
    )
  }
}
