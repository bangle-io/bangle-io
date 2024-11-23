// import React from 'react';
// import type { BaseLocationHook } from 'wouter';
// import { Router as WouterRouter } from 'wouter';

// const useRouterHook: BaseLocationHook = function useRouterHook() {
//   const store = useStore();
//   const historyLoaded = React.useState;

//   // history loaded guides us that the instance is ready
//   const historyInstance = getHistoryRef(store).current!;
//   const location = useTrackField(slicePage, 'location');

//   const to =
//     historyLoaded && location ? createTo(location, historyInstance) || '' : '';
//   const pendingCalls = React.useRef<Parameters<BaseHistory['navigate']>[]>([]);

//   const navigate = historyLoaded
//     ? historyInstance.navigate.bind(historyInstance)
//     : (...args: Parameters<BaseHistory['navigate']>) => {
//         pendingCalls.current.push(args);
//       };

//   // apply any navigation calls that we might have missed during the
//   // state loading
//   if (pendingCalls.current.length > 0 && historyInstance) {
//     for (const call of pendingCalls.current) {
//       navigate(...call);
//     }
//     pendingCalls.current = [];
//   }

//   React.useEffect(() => {
//     pendingCalls.current = [];
//   }, []);

//   return [to, navigate];
// };

// export function Router({ children }: { children: React.ReactNode }) {
//   return (
//     <WouterRouter hook={useRouterHook} matcher={locationHelpers.pathMatcher}>
//       {children}
//     </WouterRouter>
//   );
// }
