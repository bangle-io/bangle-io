import { Extension } from 'extension-helpers';
import { notesPalette } from './NotesPalette';
import { extensionName } from './config';
import { workspacePalette } from './WorkspacePalette';
import { headingPalette } from './HeadingPalette';
import { questionPalette } from './QuestionPalette';
import { actionPalette } from './ActionPalette';

const extension = Extension.create({
  name: extensionName,
  palettes: [
    headingPalette,
    workspacePalette,
    questionPalette,
    actionPalette,
    // should always be the last palette
    // TODO: add constraints to make sure it always is
    notesPalette,
  ],
});

export default extension;
