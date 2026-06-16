export const OVERTIME_RULES = {
  defaultWorkdayStart: '08:30',
  defaultWorkdayEnd: '18:00',
  lunchBreak: ['12:00', '13:30'],
  dinnerBreak: ['18:00', '19:00'],
  weekdayOvertimeStart: '19:00',
  weekendWindow: ['08:30', '24:00'],
  minimumEffectiveHours: 1,
  stepHours: 0.5,
  quarterTargetPerWorkday: 1.36,
}

export const DAY_KIND_LABELS = {
  workday: '工作日',
  weekend: '周末',
  holiday: '节假日',
  'makeup-workday': '调休上班',
}
