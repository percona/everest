import { useTheme } from '@mui/material';
import SvgIcon from '@mui/material/SvgIcon';
import {
  IconsProps,
  StatusIconProps,
  StatusIconProviderProps,
} from './status.types';

const StatusIconProvider = ({
  LightIconGeneral,
  DarkIconGeneral,
  props,
}: StatusIconProviderProps) => {
  const theme = useTheme();
  const { size = 'large' } = props;
  const iconWidth = size === 'large' ? '20px' : '16px';

  return theme.palette.mode === 'light' ? (
    <LightIconGeneral iconWidth={iconWidth} props={props} />
  ) : (
    <DarkIconGeneral iconWidth={iconWidth} props={props} />
  );
};

const ErrorIconLight = ({ iconWidth, props }: IconsProps) => (
  <SvgIcon
    sx={{ color: 'transparent', height: '100%', width: iconWidth }}
    viewBox="0 0 20 20"
    {...props}
  >
    <rect width="20" height="20" rx="10" fill="#FFECE9" />
    <mask
      id="mask0_12471_81070"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="3"
      y="3"
      width="14"
      height="14"
    >
      <rect x="3" y="3" width="14" height="14" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_12471_81070)">
      <path
        d="M10 12.9167C10.1653 12.9167 10.3038 12.8608 10.4156 12.749C10.5274 12.6372 10.5833 12.4986 10.5833 12.3333C10.5833 12.1681 10.5274 12.0295 10.4156 11.9177C10.3038 11.8059 10.1653 11.75 10 11.75C9.83472 11.75 9.69618 11.8059 9.58437 11.9177C9.47257 12.0295 9.41667 12.1681 9.41667 12.3333C9.41667 12.4986 9.47257 12.6372 9.58437 12.749C9.69618 12.8608 9.83472 12.9167 10 12.9167ZM9.41667 10.5833H10.5833V7.08333H9.41667V10.5833ZM7.8125 15.25L4.75 12.1875V7.8125L7.8125 4.75H12.1875L15.25 7.8125V12.1875L12.1875 15.25H7.8125Z"
        fill="#B10810"
      />
    </g>
    <rect
      x="0.5"
      y="0.5"
      width="19"
      height="19"
      rx="9.5"
      stroke="#B10810"
      strokeOpacity="0.2"
    />
  </SvgIcon>
);

const ErrorIconDark = ({ iconWidth, props }: IconsProps) => (
  <SvgIcon
    sx={{ color: 'transparent', height: '100%', width: iconWidth }}
    viewBox="0 0 20 20"
    {...props}
  >
    <rect width="20" height="20" rx="10" fill="#CC352E" />
    <mask
      id="mask0_12471_81209"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="3"
      y="3"
      width="14"
      height="14"
    >
      <rect x="3" y="3" width="14" height="14" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_12471_81209)">
      <path
        d="M10 12.9167C10.1653 12.9167 10.3038 12.8608 10.4156 12.749C10.5274 12.6372 10.5833 12.4986 10.5833 12.3333C10.5833 12.1681 10.5274 12.0295 10.4156 11.9177C10.3038 11.8059 10.1653 11.75 10 11.75C9.83472 11.75 9.69618 11.8059 9.58437 11.9177C9.47257 12.0295 9.41667 12.1681 9.41667 12.3333C9.41667 12.4986 9.47257 12.6372 9.58437 12.749C9.69618 12.8608 9.83472 12.9167 10 12.9167ZM9.41667 10.5833H10.5833V7.08333H9.41667V10.5833ZM7.8125 15.25L4.75 12.1875V7.8125L7.8125 4.75H12.1875L15.25 7.8125V12.1875L12.1875 15.25H7.8125Z"
        fill="white"
      />
    </g>
  </SvgIcon>
);

const WarningIconLight = ({ iconWidth, props }: IconsProps) => (
  <SvgIcon
    sx={{ color: 'transparent', height: '100%', width: iconWidth }}
    viewBox="0 0 20 20"
    {...props}
  >
    <rect width="20" height="20" rx="10" fill="#FFF2B2" />
    <mask
      id="mask0_12471_81118"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="3"
      y="3"
      width="14"
      height="14"
    >
      <rect x="3" y="3" width="14" height="14" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_12471_81118)">
      <path
        d="M3.5835 15.25L10.0002 4.16669L16.4168 15.25H3.5835ZM10.0002 13.5C10.1654 13.5 10.304 13.4441 10.4158 13.3323C10.5276 13.2205 10.5835 13.082 10.5835 12.9167C10.5835 12.7514 10.5276 12.6129 10.4158 12.5011C10.304 12.3893 10.1654 12.3334 10.0002 12.3334C9.83489 12.3334 9.69634 12.3893 9.58454 12.5011C9.47273 12.6129 9.41683 12.7514 9.41683 12.9167C9.41683 13.082 9.47273 13.2205 9.58454 13.3323C9.69634 13.4441 9.83489 13.5 10.0002 13.5ZM9.41683 11.75H10.5835V8.83335H9.41683V11.75Z"
        fill="#856E00"
      />
    </g>
    <rect
      x="0.5"
      y="0.5"
      width="19"
      height="19"
      rx="9.5"
      stroke="#856E00"
      strokeOpacity="0.2"
    />
  </SvgIcon>
);

const WarningIconDark = ({ iconWidth, props }: IconsProps) => (
  <SvgIcon
    sx={{ color: 'transparent', height: '100%', width: iconWidth }}
    viewBox="0 0 20 20"
    {...props}
  >
    <rect width="20" height="20" rx="10" fill="#F5CC00" />
    <mask
      id="mask0_12471_81213"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="3"
      y="3"
      width="14"
      height="14"
    >
      <rect x="3" y="3" width="14" height="14" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_12471_81213)">
      <path
        d="M3.5835 15.25L10.0002 4.16669L16.4168 15.25H3.5835ZM10.0002 13.5C10.1654 13.5 10.304 13.4441 10.4158 13.3323C10.5276 13.2205 10.5835 13.082 10.5835 12.9167C10.5835 12.7514 10.5276 12.6129 10.4158 12.5011C10.304 12.3893 10.1654 12.3334 10.0002 12.3334C9.83489 12.3334 9.69634 12.3893 9.58454 12.5011C9.47273 12.6129 9.41683 12.7514 9.41683 12.9167C9.41683 13.082 9.47273 13.2205 9.58454 13.3323C9.69634 13.4441 9.83489 13.5 10.0002 13.5ZM9.41683 11.75H10.5835V8.83335H9.41683V11.75Z"
        fill="#665500"
      />
    </g>
  </SvgIcon>
);

const PendingIconLight = ({ iconWidth, props }: IconsProps) => (
  <SvgIcon
    sx={{
      color: 'transparent',
      height: '100%',
      width: iconWidth,
    }}
    viewBox="0 0 20 20"
    {...props}
  >
    <animateTransform
      attributeName="transform"
      attributeType="XML"
      type="rotate"
      from="0"
      to="360"
      dur="2s"
      repeatCount="indefinite"
    />
    <rect width="20" height="20" rx="10" fill="#FFF2B2" />
    <mask
      id="mask0_12760_77845"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="3"
      y="3"
      width="14"
      height="14"
    >
      <rect x="3" y="3" width="14" height="14" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_12760_77845)">
      <path
        d="M10.0293 14.6666C8.72655 14.6666 7.61822 14.2146 6.70433 13.3104C5.79044 12.4062 5.3335 11.3028 5.3335 9.99998V9.8979L4.40016 10.8312L3.5835 10.0146L5.91683 7.68123L8.25016 10.0146L7.4335 10.8312L6.50016 9.8979V9.99998C6.50016 10.9722 6.84287 11.7986 7.52829 12.4791C8.21371 13.1597 9.04739 13.5 10.0293 13.5C10.2821 13.5 10.53 13.4708 10.7731 13.4125C11.0161 13.3541 11.2543 13.2666 11.4877 13.15L12.3627 14.025C11.9932 14.2389 11.6141 14.3993 11.2252 14.5062C10.8363 14.6132 10.4377 14.6666 10.0293 14.6666ZM14.0835 12.3187L11.7502 9.9854L12.5668 9.16873L13.5002 10.1021V9.99998C13.5002 9.02776 13.1575 8.20137 12.472 7.52081C11.7866 6.84026 10.9529 6.49998 9.971 6.49998C9.71822 6.49998 9.4703 6.52915 9.22725 6.58748C8.98419 6.64581 8.746 6.73331 8.51266 6.84998L7.63766 5.97498C8.00711 5.76109 8.38627 5.60067 8.77516 5.49373C9.16405 5.38679 9.56266 5.33331 9.971 5.33331C11.2738 5.33331 12.3821 5.7854 13.296 6.68956C14.2099 7.59373 14.6668 8.6972 14.6668 9.99998V10.1021L15.6002 9.16873L16.4168 9.9854L14.0835 12.3187Z"
        fill="#856E00"
      />
    </g>
    <rect
      x="0.5"
      y="0.5"
      width="19"
      height="19"
      rx="9.5"
      stroke="#856E00"
      strokeOpacity="0.2"
    />
  </SvgIcon>
);

const PendingIconDark = ({ iconWidth, props }: IconsProps) => (
  <SvgIcon
    sx={{ color: 'transparent', height: '100%', width: iconWidth }}
    viewBox="0 0 20 20"
    {...props}
  >
    <animateTransform
      attributeName="transform"
      attributeType="XML"
      type="rotate"
      from="0"
      to="360"
      dur="2s"
      repeatCount="indefinite"
    />
    <rect width="20" height="20" rx="10" fill="#F5CC00" />
    <mask
      id="mask0_12760_77851"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="3"
      y="3"
      width="14"
      height="14"
    >
      <rect x="3" y="3" width="14" height="14" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_12760_77851)">
      <path
        d="M10.0293 14.6666C8.72655 14.6666 7.61822 14.2146 6.70433 13.3104C5.79044 12.4062 5.3335 11.3028 5.3335 9.99998V9.8979L4.40016 10.8312L3.5835 10.0146L5.91683 7.68123L8.25016 10.0146L7.4335 10.8312L6.50016 9.8979V9.99998C6.50016 10.9722 6.84287 11.7986 7.52829 12.4791C8.21371 13.1597 9.04739 13.5 10.0293 13.5C10.2821 13.5 10.53 13.4708 10.7731 13.4125C11.0161 13.3541 11.2543 13.2666 11.4877 13.15L12.3627 14.025C11.9932 14.2389 11.6141 14.3993 11.2252 14.5062C10.8363 14.6132 10.4377 14.6666 10.0293 14.6666ZM14.0835 12.3187L11.7502 9.9854L12.5668 9.16873L13.5002 10.1021V9.99998C13.5002 9.02776 13.1575 8.20137 12.472 7.52081C11.7866 6.84026 10.9529 6.49998 9.971 6.49998C9.71822 6.49998 9.4703 6.52915 9.22725 6.58748C8.98419 6.64581 8.746 6.73331 8.51266 6.84998L7.63766 5.97498C8.00711 5.76109 8.38627 5.60067 8.77516 5.49373C9.16405 5.38679 9.56266 5.33331 9.971 5.33331C11.2738 5.33331 12.3821 5.7854 13.296 6.68956C14.2099 7.59373 14.6668 8.6972 14.6668 9.99998V10.1021L15.6002 9.16873L16.4168 9.9854L14.0835 12.3187Z"
        fill="#665500"
      />
    </g>
  </SvgIcon>
);

const SuccessIconLight = ({ iconWidth, props }: IconsProps) => (
  <SvgIcon
    sx={{ color: 'transparent', height: '100%', width: iconWidth }}
    viewBox="0 0 20 20"
    {...props}
  >
    <rect width="20" height="20" rx="10" fill="#E7F6F1" />
    <mask
      id="mask0_12471_81125"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="3"
      y="3"
      width="14"
      height="14"
    >
      <rect x="3" y="3" width="14" height="14" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_12471_81125)">
      <path
        d="M9.18317 12.6834L13.2957 8.57085L12.479 7.75419L9.18317 11.05L7.52067 9.38752L6.704 10.2042L9.18317 12.6834ZM9.99984 15.8334C9.19289 15.8334 8.43456 15.6802 7.72484 15.374C7.01511 15.0677 6.39775 14.6521 5.87275 14.1271C5.34775 13.6021 4.93213 12.9847 4.62588 12.275C4.31963 11.5653 4.1665 10.807 4.1665 10C4.1665 9.19308 4.31963 8.43474 4.62588 7.72502C4.93213 7.0153 5.34775 6.39794 5.87275 5.87294C6.39775 5.34794 7.01511 4.93231 7.72484 4.62606C8.43456 4.31981 9.19289 4.16669 9.99984 4.16669C10.8068 4.16669 11.5651 4.31981 12.2748 4.62606C12.9846 4.93231 13.6019 5.34794 14.1269 5.87294C14.6519 6.39794 15.0675 7.0153 15.3738 7.72502C15.68 8.43474 15.8332 9.19308 15.8332 10C15.8332 10.807 15.68 11.5653 15.3738 12.275C15.0675 12.9847 14.6519 13.6021 14.1269 14.1271C13.6019 14.6521 12.9846 15.0677 12.2748 15.374C11.5651 15.6802 10.8068 15.8334 9.99984 15.8334Z"
        fill="#00745B"
      />
    </g>
    <rect
      x="0.5"
      y="0.5"
      width="19"
      height="19"
      rx="9.5"
      stroke="#00745B"
      strokeOpacity="0.2"
    />
  </SvgIcon>
);

const SuccessIconDark = ({ iconWidth, props }: IconsProps) => (
  <SvgIcon
    sx={{ color: 'transparent', height: '100%', width: iconWidth }}
    viewBox="0 0 20 20"
    {...props}
  >
    <rect width="20" height="20" rx="10" fill="#00745B" />
    <mask
      id="mask0_12471_81217"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="3"
      y="3"
      width="14"
      height="14"
    >
      <rect x="3" y="3" width="14" height="14" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_12471_81217)">
      <path
        d="M9.18317 12.6834L13.2957 8.57085L12.479 7.75419L9.18317 11.05L7.52067 9.38752L6.704 10.2042L9.18317 12.6834ZM9.99984 15.8334C9.19289 15.8334 8.43456 15.6802 7.72484 15.374C7.01511 15.0677 6.39775 14.6521 5.87275 14.1271C5.34775 13.6021 4.93213 12.9847 4.62588 12.275C4.31963 11.5653 4.1665 10.807 4.1665 10C4.1665 9.19308 4.31963 8.43474 4.62588 7.72502C4.93213 7.0153 5.34775 6.39794 5.87275 5.87294C6.39775 5.34794 7.01511 4.93231 7.72484 4.62606C8.43456 4.31981 9.19289 4.16669 9.99984 4.16669C10.8068 4.16669 11.5651 4.31981 12.2748 4.62606C12.9846 4.93231 13.6019 5.34794 14.1269 5.87294C14.6519 6.39794 15.0675 7.0153 15.3738 7.72502C15.68 8.43474 15.8332 9.19308 15.8332 10C15.8332 10.807 15.68 11.5653 15.3738 12.275C15.0675 12.9847 14.6519 13.6021 14.1269 14.1271C13.6019 14.6521 12.9846 15.0677 12.2748 15.374C11.5651 15.6802 10.8068 15.8334 9.99984 15.8334Z"
        fill="white"
      />
    </g>
  </SvgIcon>
);

const UnknownIconLight = ({ iconWidth, props }: IconsProps) => (
  <SvgIcon
    sx={{ color: 'transparent', height: '100%', width: iconWidth }}
    viewBox="0 0 20 20"
    {...props}
  >
    <rect width="20" height="20" rx="10" fill="#2C323E" fillOpacity="0.12" />
    <mask
      id="mask0_12471_81131"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="3"
      y="3"
      width="14"
      height="14"
    >
      <rect x="3" y="3" width="14" height="14" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_12471_81131)">
      <path
        d="M9.97067 13.5C10.1748 13.5 10.3475 13.4294 10.4887 13.2883C10.6294 13.1475 10.6998 12.975 10.6998 12.7709C10.6998 12.5667 10.6294 12.3942 10.4887 12.2534C10.3475 12.1123 10.1748 12.0417 9.97067 12.0417C9.7665 12.0417 9.59384 12.1123 9.45267 12.2534C9.31189 12.3942 9.2415 12.5667 9.2415 12.7709C9.2415 12.975 9.31189 13.1475 9.45267 13.2883C9.59384 13.4294 9.7665 13.5 9.97067 13.5ZM9.44567 11.2542H10.5248C10.5248 10.9334 10.5614 10.6806 10.6345 10.4959C10.7072 10.3111 10.9137 10.0584 11.254 9.73752C11.5068 9.48474 11.7061 9.24402 11.8519 9.01535C11.9978 8.78708 12.0707 8.51252 12.0707 8.19169C12.0707 7.64724 11.8714 7.22919 11.4728 6.93752C11.0741 6.64585 10.6026 6.50002 10.0582 6.50002C9.504 6.50002 9.05445 6.64585 8.7095 6.93752C8.36417 7.22919 8.12345 7.57919 7.98734 7.98752L8.94984 8.36669C8.99845 8.19169 9.10792 8.0021 9.27825 7.79794C9.4482 7.59377 9.70817 7.49169 10.0582 7.49169C10.3693 7.49169 10.6026 7.57666 10.7582 7.7466C10.9137 7.91694 10.9915 8.10419 10.9915 8.30835C10.9915 8.5028 10.9332 8.68499 10.8165 8.85494C10.6998 9.02527 10.554 9.18335 10.379 9.32919C9.95123 9.70835 9.68873 9.99516 9.5915 10.1896C9.49428 10.384 9.44567 10.7389 9.44567 11.2542ZM9.99984 15.8334C9.19289 15.8334 8.43456 15.6801 7.72484 15.3737C7.01512 15.0676 6.39775 14.6521 5.87275 14.1271C5.34775 13.6021 4.93223 12.9847 4.62617 12.275C4.31973 11.5653 4.1665 10.807 4.1665 10C4.1665 9.19308 4.31973 8.43474 4.62617 7.72502C4.93223 7.0153 5.34775 6.39794 5.87275 5.87294C6.39775 5.34794 7.01512 4.93221 7.72484 4.62577C8.43456 4.31971 9.19289 4.16669 9.99984 4.16669C10.8068 4.16669 11.5651 4.31971 12.2748 4.62577C12.9846 4.93221 13.6019 5.34794 14.1269 5.87294C14.6519 6.39794 15.0674 7.0153 15.3735 7.72502C15.6799 8.43474 15.8332 9.19308 15.8332 10C15.8332 10.807 15.6799 11.5653 15.3735 12.275C15.0674 12.9847 14.6519 13.6021 14.1269 14.1271C13.6019 14.6521 12.9846 15.0676 12.2748 15.3737C11.5651 15.6801 10.8068 15.8334 9.99984 15.8334Z"
        fill="#303642"
        fillOpacity="0.5"
      />
    </g>
    <rect
      x="0.5"
      y="0.5"
      width="19"
      height="19"
      rx="9.5"
      stroke="black"
      strokeOpacity="0.05"
    />
  </SvgIcon>
);

const UnknownIconDark = ({ iconWidth, props }: IconsProps) => (
  <SvgIcon
    sx={{ color: 'transparent', height: '100%', width: iconWidth }}
    viewBox="0 0 20 20"
    {...props}
  >
    <rect width="20" height="20" rx="10" fill="#F0F1F4" fillOpacity="0.14" />
    <mask
      id="mask0_12471_81221"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="3"
      y="3"
      width="14"
      height="14"
    >
      <rect x="3" y="3" width="14" height="14" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_12471_81221)">
      <path
        d="M9.97067 13.5C10.1748 13.5 10.3475 13.4294 10.4887 13.2883C10.6294 13.1475 10.6998 12.975 10.6998 12.7709C10.6998 12.5667 10.6294 12.3942 10.4887 12.2534C10.3475 12.1123 10.1748 12.0417 9.97067 12.0417C9.7665 12.0417 9.59384 12.1123 9.45267 12.2534C9.31189 12.3942 9.2415 12.5667 9.2415 12.7709C9.2415 12.975 9.31189 13.1475 9.45267 13.2883C9.59384 13.4294 9.7665 13.5 9.97067 13.5ZM9.44567 11.2542H10.5248C10.5248 10.9334 10.5614 10.6806 10.6345 10.4959C10.7072 10.3111 10.9137 10.0584 11.254 9.73752C11.5068 9.48474 11.7061 9.24402 11.8519 9.01535C11.9978 8.78708 12.0707 8.51252 12.0707 8.19169C12.0707 7.64724 11.8714 7.22919 11.4728 6.93752C11.0741 6.64585 10.6026 6.50002 10.0582 6.50002C9.504 6.50002 9.05445 6.64585 8.7095 6.93752C8.36417 7.22919 8.12345 7.57919 7.98734 7.98752L8.94984 8.36669C8.99845 8.19169 9.10792 8.0021 9.27825 7.79794C9.4482 7.59377 9.70817 7.49169 10.0582 7.49169C10.3693 7.49169 10.6026 7.57666 10.7582 7.7466C10.9137 7.91694 10.9915 8.10419 10.9915 8.30835C10.9915 8.5028 10.9332 8.68499 10.8165 8.85494C10.6998 9.02527 10.554 9.18335 10.379 9.32919C9.95123 9.70835 9.68873 9.99516 9.5915 10.1896C9.49428 10.384 9.44567 10.7389 9.44567 11.2542ZM9.99984 15.8334C9.19289 15.8334 8.43456 15.6801 7.72484 15.3737C7.01512 15.0676 6.39775 14.6521 5.87275 14.1271C5.34775 13.6021 4.93223 12.9847 4.62617 12.275C4.31973 11.5653 4.1665 10.807 4.1665 10C4.1665 9.19308 4.31973 8.43474 4.62617 7.72502C4.93223 7.0153 5.34775 6.39794 5.87275 5.87294C6.39775 5.34794 7.01512 4.93221 7.72484 4.62577C8.43456 4.31971 9.19289 4.16669 9.99984 4.16669C10.8068 4.16669 11.5651 4.31971 12.2748 4.62577C12.9846 4.93221 13.6019 5.34794 14.1269 5.87294C14.6519 6.39794 15.0674 7.0153 15.3735 7.72502C15.6799 8.43474 15.8332 9.19308 15.8332 10C15.8332 10.807 15.6799 11.5653 15.3735 12.275C15.0674 12.9847 14.6519 13.6021 14.1269 14.1271C13.6019 14.6521 12.9846 15.0676 12.2748 15.3737C11.5651 15.6801 10.8068 15.8334 9.99984 15.8334Z"
        fill="white"
        fillOpacity="0.4"
      />
    </g>
  </SvgIcon>
);

const PausedIconLight = ({ iconWidth, props }: IconsProps) => (
  <SvgIcon
    sx={{ color: 'transparent', height: '100%', width: iconWidth }}
    viewBox="0 0 20 20"
    {...props}
  >
    <rect width="20" height="20" rx="10" fill="#2C323E" fillOpacity="0.12" />
    <mask
      id="mask0_12760_77800"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="3"
      y="3"
      width="14"
      height="14"
    >
      <rect x="3" y="3" width="14" height="14" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_12760_77800)">
      <path
        d="M8.24984 12.3334H9.4165V7.66669H8.24984V12.3334ZM10.5832 12.3334H11.7498V7.66669H10.5832V12.3334ZM9.99984 15.8334C9.19289 15.8334 8.43456 15.6802 7.72484 15.374C7.01511 15.0677 6.39775 14.6521 5.87275 14.1271C5.34775 13.6021 4.93213 12.9847 4.62588 12.275C4.31963 11.5653 4.1665 10.807 4.1665 10C4.1665 9.19308 4.31963 8.43474 4.62588 7.72502C4.93213 7.0153 5.34775 6.39794 5.87275 5.87294C6.39775 5.34794 7.01511 4.93231 7.72484 4.62606C8.43456 4.31981 9.19289 4.16669 9.99984 4.16669C10.8068 4.16669 11.5651 4.31981 12.2748 4.62606C12.9846 4.93231 13.6019 5.34794 14.1269 5.87294C14.6519 6.39794 15.0675 7.0153 15.3738 7.72502C15.68 8.43474 15.8332 9.19308 15.8332 10C15.8332 10.807 15.68 11.5653 15.3738 12.275C15.0675 12.9847 14.6519 13.6021 14.1269 14.1271C13.6019 14.6521 12.9846 15.0677 12.2748 15.374C11.5651 15.6802 10.8068 15.8334 9.99984 15.8334ZM9.99984 14.6667C11.3026 14.6667 12.4061 14.2146 13.3103 13.3104C14.2144 12.4063 14.6665 11.3028 14.6665 10C14.6665 8.69724 14.2144 7.59377 13.3103 6.6896C12.4061 5.78544 11.3026 5.33335 9.99984 5.33335C8.69706 5.33335 7.59359 5.78544 6.68942 6.6896C5.78525 7.59377 5.33317 8.69724 5.33317 10C5.33317 11.3028 5.78525 12.4063 6.68942 13.3104C7.59359 14.2146 8.69706 14.6667 9.99984 14.6667Z"
        fill="#303642"
        fillOpacity="0.5"
      />
    </g>
    <rect
      x="0.5"
      y="0.5"
      width="19"
      height="19"
      rx="9.5"
      stroke="black"
      strokeOpacity="0.05"
    />
  </SvgIcon>
);

const PausedIconDark = ({ iconWidth, props }: IconsProps) => (
  <SvgIcon
    sx={{ color: 'transparent', height: '100%', width: iconWidth }}
    viewBox="0 0 20 20"
    {...props}
  >
    <rect width="20" height="20" rx="10" fill="#F0F1F4" fillOpacity="0.14" />
    <mask
      id="mask0_12760_77820"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="3"
      y="3"
      width="14"
      height="14"
    >
      <rect x="3" y="3" width="14" height="14" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_12760_77820)">
      <path
        d="M8.24984 12.3334H9.4165V7.66669H8.24984V12.3334ZM10.5832 12.3334H11.7498V7.66669H10.5832V12.3334ZM9.99984 15.8334C9.19289 15.8334 8.43456 15.6802 7.72484 15.374C7.01511 15.0677 6.39775 14.6521 5.87275 14.1271C5.34775 13.6021 4.93213 12.9847 4.62588 12.275C4.31963 11.5653 4.1665 10.807 4.1665 10C4.1665 9.19308 4.31963 8.43474 4.62588 7.72502C4.93213 7.0153 5.34775 6.39794 5.87275 5.87294C6.39775 5.34794 7.01511 4.93231 7.72484 4.62606C8.43456 4.31981 9.19289 4.16669 9.99984 4.16669C10.8068 4.16669 11.5651 4.31981 12.2748 4.62606C12.9846 4.93231 13.6019 5.34794 14.1269 5.87294C14.6519 6.39794 15.0675 7.0153 15.3738 7.72502C15.68 8.43474 15.8332 9.19308 15.8332 10C15.8332 10.807 15.68 11.5653 15.3738 12.275C15.0675 12.9847 14.6519 13.6021 14.1269 14.1271C13.6019 14.6521 12.9846 15.0677 12.2748 15.374C11.5651 15.6802 10.8068 15.8334 9.99984 15.8334ZM9.99984 14.6667C11.3026 14.6667 12.4061 14.2146 13.3103 13.3104C14.2144 12.4063 14.6665 11.3028 14.6665 10C14.6665 8.69724 14.2144 7.59377 13.3103 6.6896C12.4061 5.78544 11.3026 5.33335 9.99984 5.33335C8.69706 5.33335 7.59359 5.78544 6.68942 6.6896C5.78525 7.59377 5.33317 8.69724 5.33317 10C5.33317 11.3028 5.78525 12.4063 6.68942 13.3104C7.59359 14.2146 8.69706 14.6667 9.99984 14.6667Z"
        fill="white"
        fillOpacity="0.4"
      />
    </g>
  </SvgIcon>
);

export const ErrorIcon = (props: StatusIconProps) => (
  <StatusIconProvider
    LightIconGeneral={ErrorIconLight}
    DarkIconGeneral={ErrorIconDark}
    props={props}
  />
);

export const WarningIcon = (props: StatusIconProps) => (
  <StatusIconProvider
    LightIconGeneral={WarningIconLight}
    DarkIconGeneral={WarningIconDark}
    props={props}
  />
);

export const PendingIcon = (props: StatusIconProps) => (
  <StatusIconProvider
    LightIconGeneral={PendingIconLight}
    DarkIconGeneral={PendingIconDark}
    props={props}
  />
);

export const SuccessIcon = (props: StatusIconProps) => (
  <StatusIconProvider
    LightIconGeneral={SuccessIconLight}
    DarkIconGeneral={SuccessIconDark}
    props={props}
  />
);

export const UnknownIcon = (props: StatusIconProps) => (
  <StatusIconProvider
    LightIconGeneral={UnknownIconLight}
    DarkIconGeneral={UnknownIconDark}
    props={props}
  />
);

export const PausedIcon = (props: StatusIconProps) => (
  <StatusIconProvider
    LightIconGeneral={PausedIconLight}
    DarkIconGeneral={PausedIconDark}
    props={props}
  />
);
