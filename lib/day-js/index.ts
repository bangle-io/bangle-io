let dayJs: typeof import('dayjs') | undefined;

export async function getDayJs(): Promise<typeof import('dayjs')> {
  if (dayJs) {
    return dayJs;
  }
  let [_dayjs, _localizedFormat]: [any, any] = (await Promise.all([
    import('dayjs'),
    import('dayjs/plugin/localizedFormat'),
  ])) as [any, any];

  dayJs = _dayjs.default || _dayjs;
  _localizedFormat = _localizedFormat.default || _localizedFormat;
  dayJs?.extend(_localizedFormat);

  if (!dayJs) {
    throw new Error('dayJs cannot be undefined');
  }

  return dayJs;
}
