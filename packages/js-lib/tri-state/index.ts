// like boolean but with 3 states
export enum TriState {
  Yes = 'Yes',
  No = 'No',
  Unknown = 'Unknown',
}

export function handleTriState<F, G, H>(
  val: TriState,
  obj: { onYes: () => F; onNo: () => G; onUnknown: () => H },
): F | G | H {
  switch (val) {
    case TriState.Yes: {
      return obj.onYes();
    }
    case TriState.No: {
      return obj.onNo();
    }
    case TriState.Unknown: {
      return obj.onUnknown();
    }
    default: {
      throw new Error('Invalid TriState');
    }
  }
}

export function toBoolean(val: TriState.Yes | TriState.No): boolean {
  if ((val as any) === TriState.Unknown) {
    throw new Error('TriState.Unknown cannot be converted to boolean');
  }

  return val === TriState.Yes;
}
