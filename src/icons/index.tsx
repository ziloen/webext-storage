import { SVGProps } from 'react'

export function CodiconCollapseAll(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      {...props}
    >
      <g fill="currentColor">
        <path d="M9 9H4v1h5z"></path>
        <path
          fillRule="evenodd"
          d="m5 3l1-1h7l1 1v7l-1 1h-2v2l-1 1H3l-1-1V6l1-1h2zm1 2h4l1 1v4h2V3H6zm4 1H3v7h7z"
          clipRule="evenodd"
        ></path>
      </g>
    </svg>
  )
}

export function CodiconExpandAll(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      {...props}
    >
      <g fill="currentColor">
        <path d="M9 9H4v1h5z"></path>
        <path d="M7 12V7H6v5z"></path>
        <path
          fillRule="evenodd"
          d="m5 3l1-1h7l1 1v7l-1 1h-2v2l-1 1H3l-1-1V6l1-1h2zm1 2h4l1 1v4h2V3H6zm4 1H3v7h7z"
          clipRule="evenodd"
        ></path>
      </g>
    </svg>
  )
}
