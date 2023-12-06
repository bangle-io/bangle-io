import './style.css';

import { useStore, useTrack } from '@nalanda/react';
import React, { useEffect } from 'react';
import { Redirect, Route, Switch, useLocation } from 'wouter';

import { PAGE_ROUTE } from '@bangle.io/constants';
import { slicePage } from '@bangle.io/slice-page';
import { locationHelpers } from '@bangle.io/ws-path';

import { PageEditor } from './PageEditor';
import { PageNotFound } from './PageNotFound';
import { PageWsName } from './PageWsHome';
import { PageWorkspaceSelect } from './PageWsSelect';

export function MainContent() {
  // it takes a while for the store to get the location
  // so we keep the tracking so the component can re-render when
  // location changes, but use the window.location to get the actual data.
  const { pageRoute: stalePageRoute } = useTrack(slicePage);
  const pageRoute = locationHelpers.getPageRoute(window.location.pathname);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (pageRoute === PAGE_ROUTE.root) {
      setLocation('/ws-select', {
        replace: true,
      });
    }
  }, [pageRoute, setLocation]);

  switch (pageRoute) {
    case PAGE_ROUTE.workspaceHome: {
      return <PageWsName />;
    }

    case PAGE_ROUTE.workspaceSelect: {
      return <PageWorkspaceSelect />;
    }

    case PAGE_ROUTE.editor: {
      return <PageEditor />;
    }

    case PAGE_ROUTE.root: {
      // see the effect hook above
      return null;
    }

    case PAGE_ROUTE.notFound: {
      return <PageNotFound />;
    }

    case PAGE_ROUTE.unknown: {
      return <PageNotFound />;
    }

    default: {
      let x: never = pageRoute;
      return <div>Unknown Page</div>;
    }
  }
}
