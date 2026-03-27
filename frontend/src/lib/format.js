export function formatMoney(cents, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100)
}

export function formatDate(value) {
  if (!value) {
    return 'TBD'
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatTime(value) {
  if (!value) {
    return '--'
  }

  const [hours, minutes] = value.split(':')
  const current = new Date()
  current.setHours(Number(hours), Number(minutes), 0, 0)

  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(current)
}

export function formatDateTime(value) {
  if (!value) {
    return 'TBD'
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
