import { keybindings } from 'config/index';
import React, { useContext } from 'react';
import { UIManagerContext } from 'ui-context';
import { useWorkspaces } from 'workspaces';
import { Link } from 'react-router-dom';
import { cx } from 'utils/utility';
import { EditorWrapperUI } from './EditorWrapperUI';

export function RootHomePage() {
  const { workspaces } = useWorkspaces();
  const recentWsComp = workspaces.length > 0 && (
    <>
      <h3 className="mt-3  text-lg font-semibold my-2">
        Welcome back! resume working on:
      </h3>
      <ul className="list-inside list-disc my-2">
        {workspaces.slice(0, 4).map((r, i) => {
          return (
            <li key={i}>
              <Link
                to={'/ws/' + r.name}
                className="text-lg sm:leading-10 font-medium mb-10 sm:mb-1 hover:underline"
              >
                {r.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
  return (
    <EditorWrapperUI>
      <h3 className="text-3xl sm:text-5xl lg:text-6xl leading-none font-extrabold tracking-tight mb-8">
        bangle.io<sup className="font-light">alpha</sup>
      </h3>

      {!recentWsComp && (
        <ul className="list-inside list-disc my-2">
          <li className="text-lg sm:text-2xl sm:leading-10 font-medium mb-10 sm:mb-1">
            A fully <span className="font-bold">local</span> Markdown Editor -
            no servers.
          </li>
          <li className="text-lg sm:text-2xl sm:leading-10 font-medium mb-10 sm:mb-1">
            WYSIWG editor that edits markdown files saved in your hard drive
          </li>
          <li className="text-lg sm:text-2xl sm:leading-10 font-medium mb-10 sm:mb-1">
            You own your data, nothing leaves your computer.
          </li>
        </ul>
      )}

      {recentWsComp ? (
        recentWsComp
      ) : (
        <>
          {Boolean(window.showDirectoryPicker) ? (
            <button
              onClick={() => {
                // dispatch({
                //   type: 'UI/UPDATE_PALETTE',
                //   value: {
                //     type: COMMAND_PALETTE,
                //     initialQuery: 'file system',
                //   },
                // });
              }}
              className="w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-pink-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
            >
              Open a local directory that has markdown content*
            </button>
          ) : (
            <button
              onClick={() => {
                // dispatch({
                //   type: 'UI/UPDATE_PALETTE',
                //   value: {
                //     type: COMMAND_PALETTE,
                //     initialQuery: 'new workspace',
                //   },
                // });
              }}
              className="w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-pink-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
            >
              Create a workspace in your browser
            </button>
          )}
          <button
            onClick={() => {
              // dispatch({
              //   type: 'UI/UPDATE_PALETTE',
              //   value: {
              //     type: COMMAND_PALETTE,
              //     initialQuery: 'import workspace',
              //   },
              // });
            }}
            className="w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-purple-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
          >
            Open a public Github repo with markdown content
          </button>
        </>
      )}

      <ul className="list-inside list-disc my-2">
        After opening a workspace use:
        <li className="text-lg sm:leading-10 font-medium mb-10 sm:mb-1">
          Press <kbd>{keybindings.toggleFilePalette.displayValue}</kbd> for File
          Palette
        </li>
        <li className="text-lg sm:leading-10 font-medium mb-10 sm:mb-1">
          Press <kbd>{keybindings.toggleCommandPalette.displayValue}</kbd> for
          Command Palette
        </li>
      </ul>
      {!recentWsComp && (
        <>
          <p className="my-2 text-sm font-semibold">
            * Only available on Chrome and Edge
          </p>
          <p className="my-2 text-sm font-semibold">
            ^Please backup your data using a vcs like Git before using it.
          </p>
        </>
      )}
      <p className="mt-3 my-2 text-lg font-semibold align-middle">
        This is still WIP, for Issues/thoughts/❤️ please visit{' '}
        <a
          target="_blank"
          rel="noreferrer"
          className="text-gray-700 font-extrabold hover:underline"
          href="https://github.com/bangle-io/bangle-io-issues"
        >
          Github
        </a>
        {' or '}
        <a
          target="_blank"
          rel="noreferrer"
          className="text-indigo-500 font-extrabold hover:underline"
          href="https://discord.gg/GvvbWJrVQY"
        >
          Discord
        </a>
      </p>
    </EditorWrapperUI>
  );
}
