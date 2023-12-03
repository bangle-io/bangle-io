import { AppLocation, PageLifeCycleState } from './slice-page';
import { ColorScheme } from './ui';

export type WorkerWindowStoreReplica = {
  page: {
    lifecycle?: PageLifeCycleState;
    location?: AppLocation;
  };
  ui: {
    widescreen?: boolean;
    colorScheme?: ColorScheme;
    screenWidth?: number;
    screenHeight?: number;
  };
};

type Primitives =
  | string
  | boolean
  | undefined
  | number
  | SerializeObject
  | SerializableArray;

type SerializeObject = { [Key in string]: Primitives } & {
  [Key in string]?: Primitives | undefined;
};

type SerializableArray = Primitives[];

() => {
  // ensure that the type is correct
  let _x = {} as WorkerWindowStoreReplica satisfies SerializeObject;

  // test
  let x = {
    foo: 3,
    // @ts-expect-error - should fail as not a primitive
    bar: {
      test: [class Foo {}],
    },
  } satisfies SerializeObject;
};
