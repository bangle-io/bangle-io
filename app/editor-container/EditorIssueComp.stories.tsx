import './style';

import type { Story } from '@storybook/react';
import React from 'react';

import { SEVERITY } from '@bangle.io/constants';

import { EditorIssueComp } from './EditorIssueComp';

export default {
  title: 'editor-container/EditorIssueComp',
  component: EditorIssueComp,
  argTypes: {},
};

const Template: Story<Parameters<typeof EditorIssueComp>[0]> = (args) => {
  // const { store } = createBasicStore({
  //   storageProvider: 'in-memory',
  //   useUISlice: true,
  //   useEditorManagerSlice: true,
  // });

  return (
    // <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
    <div style={{ width: 400 }}>
      <EditorIssueComp {...args}></EditorIssueComp>
    </div>
    // </TestStoreProvider>
  );
};

export const Error = Template.bind({});

Error.args = {
  editorIssue: {
    title: 'This is a test',
    severity: SEVERITY.ERROR,
    serialOperation: 'operation::something',
    uid: '123',
    description: 'something went wrong',
    wsPath: 'test:one.md',
  },
  onPress: () => {},
};

export const Warning = Template.bind({});

Warning.args = {
  editorIssue: {
    title: 'This is a test',
    severity: SEVERITY.WARNING,
    serialOperation: 'operation::something',
    uid: '123',
    description: 'something went wrong',
    wsPath: 'test:one.md',
  },
  onPress: () => {},
};
