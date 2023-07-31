import React, { useCallback } from 'react';

import {
  BoldButton,
  BulletListButton,
  CodeButton,
  FloatingLinkButton,
  FloatingMenu,
  HeadingButton,
  ItalicButton,
  LinkSubMenu,
  Menu,
  MenuGroup,
  OrderedListButton,
  TodoListButton,
} from '@bangle.dev/react-menu';

import { menuKey } from '@bangle.io/editor-common';

export function MenuComp() {
  const renderMenuType = useCallback(({ type, menuKey }) => {
    if (type === 'defaultMenu') {
      return (
        <Menu>
          <MenuGroup>
            <BoldButton />
            <ItalicButton />
            <CodeButton />
            <FloatingLinkButton menuKey={menuKey} />
          </MenuGroup>
          <MenuGroup>
            <HeadingButton level={2} />
            <HeadingButton level={3} />
            <BulletListButton />
            <TodoListButton />
            <OrderedListButton />
          </MenuGroup>
        </Menu>
      );
    }
    if (type === 'linkSubMenu') {
      return (
        <Menu>
          <LinkSubMenu />
        </Menu>
      );
    }

    return null;
  }, []);

  return <FloatingMenu menuKey={menuKey} renderMenuType={renderMenuType} />;
}
