import './style.css';

import {
  Cell,
  Column,
  defaultTheme,
  Flex,
  Provider,
  Row,
  TableBody,
  TableHeader,
  TableView,
  ToggleButton,
  View,
} from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import React from 'react';

import { sliceUI } from '@bangle.io/slice-ui';

export function MainContent() {
  const {} = useTrack(sliceUI);
  const store = useStore();

  return (
    <Flex
      direction="column"
      height="100%"
      UNSAFE_className="overflow-y-scroll B-app-main-content px-4 pt-4"
    >
      <TableView
        aria-label="Example table with static contents"
        selectionMode="multiple"
      >
        <TableHeader>
          <Column>Name</Column>
          <Column>Type</Column>
          <Column align="end">Date Modified</Column>
        </TableHeader>
        <TableBody>
          <Row>
            <Cell>Games</Cell>
            <Cell>File folder</Cell>
            <Cell>6/7/2020</Cell>
          </Row>
          <Row>
            <Cell>Program Files</Cell>
            <Cell>File folder</Cell>
            <Cell>4/7/2021</Cell>
          </Row>
          <Row>
            <Cell>bootmgr</Cell>
            <Cell>System file</Cell>
            <Cell>11/20/2010</Cell>
          </Row>
          <Row>
            <Cell>log.txt</Cell>
            <Cell>Text Document</Cell>
            <Cell>1/18/2016</Cell>
          </Row>
        </TableBody>
      </TableView>
    </Flex>
  );
}
