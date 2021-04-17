import React, { useContext } from 'react';
import { UIManagerContext } from 'ui-context';
import { cx } from 'utils/utility';

/**
 * A component that provides the same markup
 * as the regular editor. Use it render things in place
 * of the actual editor.
 * @param {*} param0
 */
export function EditorWrapperUI({ children }) {
  const { widescreen } = useContext(UIManagerContext);

  return (
    <div
      className={cx(
        'bangle-editor-area primary-editor ',
        widescreen && 'widescreen',
      )}
    >
      <div className="bangle-editor-container">
        <div className="bangle-editor-inner-container">{children}</div>
      </div>
    </div>
  );
}
