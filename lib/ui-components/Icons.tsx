import React from 'react';

import { cx } from '@bangle.io/utils';

export const Svg = ({
  children,
  style = {},
  size,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  size?: number;
  className?: string;
} & React.SVGProps<SVGSVGElement>) => (
  <svg
    style={style}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={`fill-current ${size ? `h-${size} w-${size}` : ''} ${className}`}
    {...props}
  >
    {children}
  </svg>
);

export const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M6.343 7.757L4.93 9.172 12 16.242l7.071-7.07-1.414-1.415L12 13.414 6.343 7.757z" />
  </Svg>
);

export const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path
      d="M6.2253 4.81108C5.83477 4.42056 5.20161 4.42056 4.81108 4.81108C4.42056 5.20161 4.42056 5.83477 4.81108 6.2253L10.5858 12L4.81114 17.7747C4.42062 18.1652 4.42062 18.7984 4.81114 19.1889C5.20167 19.5794 5.83483 19.5794 6.22535 19.1889L12 13.4142L17.7747 19.1889C18.1652 19.5794 18.7984 19.5794 19.1889 19.1889C19.5794 18.7984 19.5794 18.1652 19.1889 17.7747L13.4142 12L19.189 6.2253C19.5795 5.83477 19.5795 5.20161 19.189 4.81108C18.7985 4.42056 18.1653 4.42056 17.7748 4.81108L12 10.5858L6.2253 4.81108Z"
      fill="currentColor"
    />
  </Svg>
);

export const ArrowsExpand = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
    />
  </svg>
);
export function TerminalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        d="M5.0333 14.8284L6.44751 16.2426L10.6902 12L6.44751 7.75733L5.0333 9.17155L7.86172 12L5.0333 14.8284Z"
        fill="currentColor"
      />
      <path d="M15 14H11V16H15V14Z" fill="currentColor" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M2 2C0.895431 2 0 2.89543 0 4V20C0 21.1046 0.89543 22 2 22H22C23.1046 22 24 21.1046 24 20V4C24 2.89543 23.1046 2 22 2H2ZM22 4H2L2 20H22V4Z"
      />
    </Svg>
  );
}

export function InfobarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M16 7C15.4477 7 15 7.44772 15 8C15 8.55228 15.4477 9 16 9H19C19.5523 9 20 8.55228 20 8C20 7.44772 19.5523 7 19 7H16Z" />
      <path d="M15 12C15 11.4477 15.4477 11 16 11H19C19.5523 11 20 11.4477 20 12C20 12.5523 19.5523 13 19 13H16C15.4477 13 15 12.5523 15 12Z" />
      <path d="M16 15C15.4477 15 15 15.4477 15 16C15 16.5523 15.4477 17 16 17H19C19.5523 17 20 16.5523 20 16C20 15.4477 19.5523 15 19 15H16Z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 3C1.34315 3 0 4.34315 0 6V18C0 19.6569 1.34315 21 3 21H21C22.6569 21 24 19.6569 24 18V6C24 4.34315 22.6569 3 21 3H3ZM21 5H13V19H21C21.5523 19 22 18.5523 22 18V6C22 5.44772 21.5523 5 21 5ZM3 5H11V19H3C2.44772 19 2 18.5523 2 18V6C2 5.44772 2.44772 5 3 5Z"
      />
    </Svg>
  );
}

export function AlbumIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 19C2 20.6569 3.34315 22 5 22H19C20.6569 22 22 20.6569 22 19V5C22 3.34315 20.6569 2 19 2H5C3.34315 2 2 3.34315 2 5V19ZM20 19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V5C4 4.44772 4.44772 4 5 4H10V12.0111L12.395 12.0112L14.0001 9.86419L15.6051 12.0112H18.0001L18 4H19C19.5523 4 20 4.44772 20 5V19ZM16 4H12V9.33585L14.0001 6.66046L16 9.33571V4Z"
        fill="currentColor"
      />
    </Svg>
  );
}

export function BrowseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.364 13.1214C15.2876 14.045 15.4831 15.4211 14.9504 16.5362L16.4853 18.0711C16.8758 18.4616 16.8758 19.0948 16.4853 19.4853C16.0948 19.8758 15.4616 19.8758 15.0711 19.4853L13.5361 17.9504C12.421 18.4831 11.045 18.2876 10.1213 17.364C8.94975 16.1924 8.94975 14.2929 10.1213 13.1214C11.2929 11.9498 13.1924 11.9498 14.364 13.1214ZM12.9497 15.9498C13.3403 15.5593 13.3403 14.9261 12.9497 14.5356C12.5592 14.145 11.9261 14.145 11.5355 14.5356C11.145 14.9261 11.145 15.5593 11.5355 15.9498C11.9261 16.3403 12.5592 16.3403 12.9497 15.9498Z"
        fill="currentColor"
      />
      <path d="M8 5H16V7H8V5Z" fill="currentColor" />
      <path d="M16 9H8V11H16V9Z" fill="currentColor" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 4C4 2.34315 5.34315 1 7 1H17C18.6569 1 20 2.34315 20 4V20C20 21.6569 18.6569 23 17 23H7C5.34315 23 4 21.6569 4 20V4ZM7 3H17C17.5523 3 18 3.44772 18 4V20C18 20.5523 17.5523 21 17 21H7C6.44772 21 6 20.5523 6 20V4C6 3.44772 6.44771 3 7 3Z"
        fill="currentColor"
      />
    </Svg>
  );
}

export function FileDocumentIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M7 18H17V16H7V18Z" fill="currentColor" />
      <path d="M17 14H7V12H17V14Z" fill="currentColor" />
      <path d="M7 10H11V8H7V10Z" fill="currentColor" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 2C4.34315 2 3 3.34315 3 5V19C3 20.6569 4.34315 22 6 22H18C19.6569 22 21 20.6569 21 19V9C21 5.13401 17.866 2 14 2H6ZM6 4H13V9H19V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V5C5 4.44772 5.44772 4 6 4ZM15 4.10002C16.6113 4.4271 17.9413 5.52906 18.584 7H15V4.10002Z"
        fill="currentColor"
      />
    </Svg>
  );
}

export function SecondaryEditorIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 4H22V20H2V4ZM16 18V6H4V18H16Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function MoreAltIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props} fill="none">
      <path
        d="M8 12C8 13.1046 7.10457 14 6 14C4.89543 14 4 13.1046 4 12C4 10.8954 4.89543 10 6 10C7.10457 10 8 10.8954 8 12Z"
        fill="currentColor"
      />
      <path
        d="M14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12Z"
        fill="currentColor"
      />
      <path
        d="M18 14C19.1046 14 20 13.1046 20 12C20 10.8954 19.1046 10 18 10C16.8954 10 16 10.8954 16 12C16 13.1046 16.8954 14 18 14Z"
        fill="currentColor"
      />
    </Svg>
  );
}

export function ChevronDoubleRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...props} fill="none">
      <path
        d="M5.63605 7.75735L7.05026 6.34314L12.7071 12L7.05029 17.6568L5.63608 16.2426L9.87869 12L5.63605 7.75735Z"
        fill="currentColor"
      />
      <path
        d="M12.7071 6.34314L11.2929 7.75735L15.5356 12L11.2929 16.2426L12.7072 17.6568L18.364 12L12.7071 6.34314Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function NullIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    ></svg>
  );
}

export function DocumentAddIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

export function SpinnerIcon({ className = '', ...props }) {
  return (
    <svg
      className={'B-ui-components_spinner-icon ' + className}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      {...props}
    >
      <circle cx="50" cy="50" r="45" />
    </svg>
  );
}

export function ExclamationCircleIcon({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      className={className}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function ExclamationIcon({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      className={className}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

export function InformationCircleIcon({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      className={className}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function CheckCircleIcon({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      className={className}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function QuestionIcon({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="white"
      viewBox="0 0 70 70"
      stroke="currentColor"
      className={className}
      {...props}
    >
      <text
        x="25%"
        y="70"
        strokeWidth={2}
        fontSize="90px"
        fontWeight={300}
        style={
          {
            // font: 'regular 70px sans-serif',
          }
        }
      >
        ?
      </text>
    </svg>
  );
}

export function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2px"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

export function SingleCharIcon({ char, ...props }: { char: string } & any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    >
      <circle r="11" cx="12" cy="12" strokeWidth="1" style={{ fill: 'none' }} />
      <text
        alignmentBaseline="central"
        x="50%"
        y="50%"
        strokeWidth="0"
        textAnchor="middle"
      >
        {char}
      </text>
    </svg>
  );
}

export function FolderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

export function NewNoteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export function NoteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      stroke="currentColor"
      {...props}
    >
      <path d="M10,5.5V1H3.5a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h11a.5.5,0,0,0,.5-.5V6H10.5A.5.5,0,0,1,10,5.5Z" />
      <path d="M11,1h.043a.5.5,0,0,1,.3535.1465l3.457,3.457A.5.5,0,0,1,15,4.957V5H11Z" />
    </svg>
  );
}

export function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

export function GiftIcon({ showDot = false, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
      />
      {showDot && (
        <circle
          cx="21"
          style={{ fill: 'var(--BV-accent-primary-0)' }}
          cy="3"
          r="3"
          strokeWidth={0}
        />
      )}
    </svg>
  );
}

export function SettingsIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      fill="currentColor"
      {...props}
    >
      <rect fill="#ff13dc" opacity="0" width="18" height="18" />
      <path d="M16.45,7.8965H14.8945a5.97644,5.97644,0,0,0-.921-2.2535L15.076,4.54a.55.55,0,0,0,.00219-.77781L15.076,3.76l-.8365-.836a.55.55,0,0,0-.77781-.00219L13.4595,2.924,12.357,4.0265a5.96235,5.96235,0,0,0-2.2535-.9205V1.55a.55.55,0,0,0-.55-.55H8.45a.55.55,0,0,0-.55.55V3.106a5.96235,5.96235,0,0,0-2.2535.9205l-1.1-1.1025a.55.55,0,0,0-.77781-.00219L3.7665,2.924,2.924,3.76a.55.55,0,0,0-.00219.77781L2.924,4.54,4.0265,5.643a5.97644,5.97644,0,0,0-.921,2.2535H1.55a.55.55,0,0,0-.55.55V9.55a.55.55,0,0,0,.55.55H3.1055a5.967,5.967,0,0,0,.921,2.2535L2.924,13.4595a.55.55,0,0,0-.00219.77782l.00219.00218.8365.8365a.55.55,0,0,0,.77781.00219L4.5405,15.076,5.643,13.9735a5.96235,5.96235,0,0,0,2.2535.9205V16.45a.55.55,0,0,0,.55.55H9.55a.55.55,0,0,0,.55-.55V14.894a5.96235,5.96235,0,0,0,2.2535-.9205L13.456,15.076a.55.55,0,0,0,.77782.00219L14.236,15.076l.8365-.8365a.55.55,0,0,0,.00219-.77781l-.00219-.00219L13.97,12.357a5.967,5.967,0,0,0,.921-2.2535H16.45a.55.55,0,0,0,.55-.55V8.45a.55.55,0,0,0-.54649-.55349ZM11.207,9A2.207,2.207,0,1,1,9,6.793H9A2.207,2.207,0,0,1,11.207,9Z" />
    </svg>
  );
}
export function EditIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="18"
      viewBox="0 0 18 18"
      fill="currentColor"
      {...props}
    >
      <path d="M16.7835,4.1,13.9,1.216a.60751.60751,0,0,0-.433-.1765H13.45a.6855.6855,0,0,0-.4635.203L2.542,11.686a.49494.49494,0,0,0-.1255.211L1.0275,16.55c-.057.1885.2295.4255.3915.4255a.12544.12544,0,0,0,.031-.0035c.138-.0315,3.933-1.172,4.6555-1.389a.486.486,0,0,0,.207-.1245L16.7565,5.014a.686.686,0,0,0,.2-.4415A.61049.61049,0,0,0,16.7835,4.1ZM5.7,14.658c-1.0805.3245-2.431.7325-3.3645,1.011L3.34,12.304Z" />
    </svg>
  );
}
export function NoEditIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="18"
      viewBox="0 0 18 18"
      fill="currentColor"
      {...props}
    >
      <rect
        height="21.927"
        rx="0.409"
        transform="translate(-3.72777 9.00002) rotate(-45)"
        width="1.2275"
        x="8.38635"
        y="-1.96368"
      />
      <path d="M5.5905,8.6375l-3.05,3.05a.5.5,0,0,0-.1255.2105L1.028,16.55c-.057.188.2295.425.3915.425a.15022.15022,0,0,0,.0305-.003c.138-.032,3.9335-1.172,4.656-1.3895a.48708.48708,0,0,0,.207-.1245l3.05-3.05ZM2.334,15.669l1.0045-3.3655,2.36,2.354C4.618,14.9825,3.2675,15.3905,2.334,15.669Z" />
      <path d="M16.7835,4.1,13.9,1.216a.60751.60751,0,0,0-.4335-.1765H13.45a.6855.6855,0,0,0-.4635.203l-4.4,4.312,3.7715,3.771,4.4-4.3115a.68751.68751,0,0,0,.2-.4415A.61148.61148,0,0,0,16.7835,4.1Z" />
    </svg>
  );
}

export function ChevronLeftIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      fill="currentColor"
      {...props}
    >
      <rect fill="#ff13dc" opacity="0" width="18" height="18" />
      <path d="M6,9a.994.994,0,0,0,.2925.7045l3.9915,3.99a1,1,0,1,0,1.4355-1.386l-.0245-.0245L8.4095,9l3.286-3.285A1,1,0,0,0,10.309,4.28l-.0245.0245L6.293,8.2945A.994.994,0,0,0,6,9Z" />
    </svg>
  );
}
export function ChevronRightIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      fill="currentColor"
      {...props}
    >
      <rect fill="#ff13dc" opacity="0" width="18" height="18" />
      <path d="M12,9a.994.994,0,0,1-.2925.7045l-3.9915,3.99a1,1,0,1,1-1.4355-1.386l.0245-.0245L9.5905,9,6.3045,5.715A1,1,0,0,1,7.691,4.28l.0245.0245,3.9915,3.99A.994.994,0,0,1,12,9Z" />
    </svg>
  );
}
export function ChevronDoubleLeftIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      fill="currentColor"
      {...props}
    >
      <path d="M3,9a.994.994,0,0,0,.2925.7045l3.9915,3.99a1,1,0,1,0,1.4355-1.386L8.695,12.284,5.4095,9l3.286-3.285A1,1,0,0,0,7.309,4.28l-.0245.0245L3.293,8.2945A.994.994,0,0,0,3,9Z" />
      <path d="M9,9a.994.994,0,0,0,.2925.7045l3.9915,3.99a1,1,0,1,0,1.4355-1.386l-.0245-.0245L11.4095,9l3.286-3.285A1,1,0,0,0,13.309,4.28l-.0245.0245L9.293,8.2945A.994.994,0,0,0,9,9Z" />
    </svg>
  );
}

export function MoreIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="18"
      viewBox="0 0 18 18"
      width="18"
      fill="currentColor"
      {...props}
    >
      <path
        className="a"
        d="M16.45,7.8965H14.8945a5.97644,5.97644,0,0,0-.921-2.2535L15.076,4.54a.55.55,0,0,0,.00219-.77781L15.076,3.76l-.8365-.836a.55.55,0,0,0-.77781-.00219L13.4595,2.924,12.357,4.0265a5.96235,5.96235,0,0,0-2.2535-.9205V1.55a.55.55,0,0,0-.55-.55H8.45a.55.55,0,0,0-.55.55V3.106a5.96235,5.96235,0,0,0-2.2535.9205l-1.1-1.1025a.55.55,0,0,0-.77781-.00219L3.7665,2.924,2.924,3.76a.55.55,0,0,0-.00219.77781L2.924,4.54,4.0265,5.643a5.97644,5.97644,0,0,0-.921,2.2535H1.55a.55.55,0,0,0-.55.55V9.55a.55.55,0,0,0,.55.55H3.1055a5.967,5.967,0,0,0,.921,2.2535L2.924,13.4595a.55.55,0,0,0-.00219.77782l.00219.00218.8365.8365a.55.55,0,0,0,.77781.00219L4.5405,15.076,5.643,13.9735a5.96235,5.96235,0,0,0,2.2535.9205V16.45a.55.55,0,0,0,.55.55H9.55a.55.55,0,0,0,.55-.55V14.894a5.96235,5.96235,0,0,0,2.2535-.9205L13.456,15.076a.55.55,0,0,0,.77782.00219L14.236,15.076l.8365-.8365a.55.55,0,0,0,.00219-.77781l-.00219-.00219L13.97,12.357a5.967,5.967,0,0,0,.921-2.2535H16.45a.55.55,0,0,0,.55-.55V8.45a.55.55,0,0,0-.54649-.55349ZM11.207,9A2.207,2.207,0,1,1,9,6.793H9A2.207,2.207,0,0,1,11.207,9Z"
      />
    </svg>
  );
}

export function MoreSmallListIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="18"
      viewBox="0 0 18 18"
      width="18"
      fill="currentColor"
      {...props}
    >
      <circle cx="4.5" cy="9" r="1.425" />
      <circle cx="9" cy="9" r="1.425" />
      <circle cx="13.5" cy="9" r="1.425" />
    </svg>
  );
}

export function TwitterIcon(props: any) {
  return (
    <svg fill="#1DA1F2" viewBox="0 0 24 24" {...props}>
      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
    </svg>
  );
}

export function DiscordIcon(props: any) {
  return (
    <svg
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 71 55"
      {...props}
    >
      <g clipPath="url(#a)">
        <path
          d="M60.1 4.9A58.55 58.55 0 0 0 45.65.42a.22.22 0 0 0-.23.1 40.78 40.78 0 0 0-1.8 3.7 54.05 54.05 0 0 0-16.23 0 37.4 37.4 0 0 0-1.83-3.7.23.23 0 0 0-.23-.1c-5.07.87-9.92 2.4-14.45 4.48a.2.2 0 0 0-.1.08C1.58 18.73-.94 32.14.3 45.39c0 .07.05.13.1.17a58.88 58.88 0 0 0 17.72 8.96c.1.03.2 0 .25-.08a42.08 42.08 0 0 0 3.63-5.9.22.22 0 0 0-.12-.31 38.77 38.77 0 0 1-5.54-2.64.23.23 0 0 1-.02-.38l1.1-.86a.22.22 0 0 1 .23-.03 41.99 41.99 0 0 0 35.68 0 .22.22 0 0 1 .23.02c.36.3.73.59 1.1.87.13.1.12.3-.02.38a36.38 36.38 0 0 1-5.54 2.63.23.23 0 0 0-.12.32 47.25 47.25 0 0 0 3.63 5.9c.05.07.15.1.24.08 5.8-1.8 11.69-4.5 17.76-8.96.06-.04.09-.1.1-.17C72.16 30.08 68.2 16.78 60.2 5a.18.18 0 0 0-.1-.1ZM23.73 37.33c-3.5 0-6.38-3.22-6.38-7.16 0-3.95 2.82-7.16 6.38-7.16 3.58 0 6.43 3.24 6.38 7.16 0 3.94-2.83 7.16-6.38 7.16Zm23.59 0c-3.5 0-6.38-3.22-6.38-7.16 0-3.95 2.82-7.16 6.38-7.16 3.58 0 6.43 3.24 6.38 7.16 0 3.94-2.8 7.16-6.38 7.16Z"
          fill="#5865F2"
        ></path>
      </g>
    </svg>
  );
}

export function BangleIcon(props: any) {
  return (
    <svg
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 320"
      {...props}
    >
      <path
        d="M237.44 235.98c24.29-24.72 40.6-53.21 47.18-79.5 6.54-26.17 3.59-51.14-12.26-67.28-15.86-16.14-40.4-19.13-66.1-12.48-25.84 6.7-53.84 23.3-78.12 48.01-24.29 24.72-40.6 53.21-47.17 79.5-6.55 26.18-3.6 51.14 12.26 67.28 15.85 16.14 40.39 19.13 66.1 12.48 25.83-6.7 53.83-23.3 78.11-48.01Z"
        stroke="#000"
        strokeWidth="10"
      ></path>
      <path
        d="M230.93 231.25c24.29-24.72 40.6-53.22 47.17-79.5 6.55-26.18 3.6-51.14-12.26-67.28-15.85-16.14-40.38-19.14-66.1-12.48-25.83 6.69-53.83 23.3-78.11 48-24.29 24.72-40.6 53.22-47.17 79.51-6.55 26.17-3.6 51.14 12.26 67.27 15.85 16.14 40.38 19.14 66.1 12.48 25.83-6.69 53.83-23.29 78.11-48Z"
        stroke="#000"
        strokeWidth="10"
      ></path>
      <path
        d="M225.35 226.51c24.29-24.71 40.6-53.21 47.17-79.5 6.54-26.17 3.6-51.14-12.26-67.28-15.85-16.13-40.39-19.13-66.1-12.47-25.83 6.69-53.83 23.29-78.12 48-24.28 24.72-40.6 53.22-47.17 79.5-6.54 26.18-3.6 51.14 12.26 67.28s40.4 19.14 66.1 12.48c25.84-6.69 53.84-23.3 78.12-48Z"
        stroke="#000"
        strokeWidth="10"
      ></path>
      <path
        d="M223.5 224.62c24.28-24.72 40.59-53.21 47.16-79.5 6.54-26.18 3.6-51.14-12.26-67.28-15.85-16.14-40.39-19.14-66.1-12.48-25.83 6.7-53.83 23.3-78.12 48.01-24.28 24.72-40.6 53.21-47.17 79.5-6.54 26.17-3.6 51.14 12.26 67.28s40.4 19.13 66.1 12.48c25.84-6.7 53.84-23.3 78.12-48.01Z"
        stroke="#7FCEEE"
        strokeWidth="10"
      ></path>
      <path
        d="M216.98 219.88c24.28-24.71 40.6-53.2 47.17-79.5 6.54-26.17 3.6-51.14-12.26-67.27-15.86-16.14-40.39-19.14-66.1-12.48-25.83 6.69-53.83 23.3-78.12 48-24.28 24.72-40.6 53.22-47.17 79.51-6.54 26.17-3.6 51.14 12.26 67.27 15.86 16.14 40.39 19.14 66.1 12.48 25.84-6.69 53.83-23.29 78.12-48Z"
        stroke="#7FCEEE"
        strokeWidth="10"
      ></path>
      <path
        d="M213.26 216.1c24.28-24.72 40.6-53.22 47.17-79.5 6.54-26.18 3.6-51.14-12.26-67.28s-40.39-19.14-66.1-12.48c-25.83 6.7-53.83 23.3-78.12 48-24.28 24.72-40.6 53.22-47.17 79.51-6.54 26.17-3.6 51.14 12.26 67.28 15.86 16.13 40.39 19.13 66.1 12.48 25.84-6.7 53.83-23.3 78.12-48.01Z"
        stroke="#7FCEEE"
        strokeWidth="10"
      ></path>
      <path
        d="M207.68 211.36c24.28-24.71 40.6-53.2 47.17-79.5 6.54-26.17 3.6-51.14-12.26-67.27-15.86-16.14-40.4-19.14-66.1-12.48-25.84 6.69-53.84 23.29-78.12 48-24.29 24.72-40.6 53.22-47.17 79.5-6.54 26.18-3.6 51.15 12.26 67.28 15.86 16.14 40.39 19.14 66.1 12.48 25.83-6.69 53.83-23.3 78.12-48Z"
        stroke="#7FCEEE"
        strokeWidth="10"
      ></path>
      <path
        d="M203.96 207.58c24.28-24.72 40.6-53.22 47.17-79.5 6.54-26.18 3.6-51.14-12.26-67.28s-40.4-19.14-66.1-12.48c-25.84 6.69-53.84 23.3-78.12 48-24.29 24.72-40.6 53.22-47.17 79.51-6.54 26.17-3.6 51.14 12.26 67.28 15.85 16.13 40.39 19.13 66.1 12.47 25.83-6.69 53.83-23.29 78.12-48Z"
        stroke="#7FCEEE"
        strokeWidth="10"
      ></path>
      <path
        d="M200.24 203.79c24.28-24.72 40.6-53.21 47.16-79.5 6.55-26.17 3.6-51.14-12.25-67.28-15.86-16.14-40.4-19.13-66.1-12.48-25.84 6.7-53.84 23.3-78.12 48.01-24.29 24.72-40.6 53.21-47.17 79.5-6.55 26.18-3.6 51.14 12.26 67.28 15.85 16.14 40.38 19.13 66.1 12.48 25.83-6.7 53.83-23.3 78.12-48.01Z"
        stroke="#000"
        strokeWidth="10"
      ></path>
      <path
        d="M196.51 200c24.29-24.71 40.6-53.21 47.17-79.5 6.55-26.17 3.6-51.14-12.26-67.28-15.85-16.13-40.38-19.13-66.1-12.47-25.83 6.69-53.83 23.29-78.11 48-24.29 24.72-40.6 53.22-47.17 79.5-6.55 26.18-3.6 51.15 12.26 67.28 15.85 16.14 40.38 19.14 66.1 12.48 25.83-6.69 53.83-23.3 78.11-48Z"
        stroke="#000"
        strokeWidth="10"
      ></path>
      <path
        d="M191.86 195.27c24.29-24.72 40.6-53.21 47.17-79.5 6.54-26.17 3.6-51.14-12.26-67.28-15.85-16.14-40.39-19.14-66.1-12.48-25.83 6.7-53.83 23.3-78.12 48.01-24.28 24.72-40.6 53.21-47.17 79.5-6.54 26.17-3.59 51.14 12.27 67.28 15.85 16.13 40.38 19.13 66.1 12.48 25.83-6.7 53.83-23.3 78.11-48.01Z"
        stroke="#000"
        strokeWidth="10"
      ></path>
    </svg>
  );
}

export function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
    >
      <path d="M32 6C17.641 6 6 17.641 6 32c0 12.277 8.512 22.56 19.955 25.286-.592-.141-1.179-.299-1.755-.479V50.85c0 0-.975.325-2.275.325-3.637 0-5.148-3.245-5.525-4.875-.229-.993-.827-1.934-1.469-2.509-.767-.684-1.126-.686-1.131-.92-.01-.491.658-.471.975-.471 1.625 0 2.857 1.729 3.429 2.623 1.417 2.207 2.938 2.577 3.721 2.577.975 0 1.817-.146 2.397-.426.268-1.888 1.108-3.57 2.478-4.774-6.097-1.219-10.4-4.716-10.4-10.4 0-2.928 1.175-5.619 3.133-7.792C19.333 23.641 19 22.494 19 20.625c0-1.235.086-2.751.65-4.225 0 0 3.708.026 7.205 3.338C28.469 19.268 30.196 19 32 19s3.531.268 5.145.738c3.497-3.312 7.205-3.338 7.205-3.338.567 1.474.65 2.99.65 4.225 0 2.015-.268 3.19-.432 3.697C46.466 26.475 47.6 29.124 47.6 32c0 5.684-4.303 9.181-10.4 10.4 1.628 1.43 2.6 3.513 2.6 5.85v8.557c-.576.181-1.162.338-1.755.479C49.488 54.56 58 44.277 58 32 58 17.641 46.359 6 32 6zM33.813 57.93C33.214 57.972 32.61 58 32 58 32.61 58 33.213 57.971 33.813 57.93zM37.786 57.346c-1.164.265-2.357.451-3.575.554C35.429 57.797 36.622 57.61 37.786 57.346zM32 58c-.61 0-1.214-.028-1.813-.07C30.787 57.971 31.39 58 32 58zM29.788 57.9c-1.217-.103-2.411-.289-3.574-.554C27.378 57.61 28.571 57.797 29.788 57.9z" />
    </svg>
  );
}

export function LoadingCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={cx('animate-spin', props.className)}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}
