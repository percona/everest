interface Typography {
  [key: string]: Array<{
    title: string;
    variant: string;
    text: string;
    style?: {
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: string;
      lineHeight?: string;
      color?: string;
      textDecoration?: string;
    };
  }>;
}
export const TYPOGRAPHY: Typography = {
    'SM/MD/LG/XL (600+)': [
        {
            title: 'h1',
            variant: 'h1',
            text: 'Disregard and contempt',
            style: {
                fontSize: '48px',
            }
        },
        {
            title: 'h2',
            variant: 'h2',
            text: 'Whereas disregard and contempt for human rights',
            style: {
                fontSize: '40px',
            }
        },
        {
            title: 'h3',
            variant: 'h3',
            text: 'Whereas disregard and contempt for human rights have resulted',
            style: {
                fontSize: '33px',
            }
        },
        {
            title: 'h4',
            variant: 'h4',
            text: 'No one shall be held in slavery or servitude; slavery and the slave trade shall be prohibited',
            style: {
                fontSize: '28px',
            }
        },
        {
            title: 'h5',
            variant: 'h5',
            text: 'No one shall be held in slavery or servitude; slavery and the slave trade shall be prohibited in all their forms',
            style: {
                fontSize: '23px',
            }
        },
        {
            title: 'h6',
            variant: 'h6',
            text: 'Everyone has the right to an effective remedy by the competent national tribunals for acts violating the fundamental rights granted him by the constitution or by law',
            style: {
                fontSize: '19px',
            }
        },
    ],
    'XS (0-599)': [
        {
            title: 'h1',
            variant: 'h1',
            text: 'Disregard and contempt',
            style: {
                fontSize: '32px',
            }
        },
        {
            title: 'h2',
            variant: 'h2',
            text: 'Whereas disregard and contempt for human rights',
            style: {
                fontSize: '29px',
            }
        },
        {
            title: 'h3',
            variant: 'h3',
            text: 'Whereas disregard and contempt for human rights have resulted',
            style: {
                fontSize: '26px',
            }
        },
        {
            title: 'h4',
            variant: 'h4',
            text: 'No one shall be held in slavery or servitude; slavery and the slave trade shall be prohibited',
            style: {
                fontSize: '23px',
            }
        },
        {
            title: 'h5',
            variant: 'h5',
            text: 'No one shall be held in slavery or servitude; slavery and the slave trade shall be prohibited in all their forms',
            style: {
                fontSize: '20px',
            }
        },
        {
            title: 'h6',
            variant: 'h6',
            text: 'Everyone has the right to an effective remedy by the competent national tribunals for acts violating the fundamental rights granted him by the constitution or by law',
            style: {
                fontSize: '18px',
            }
        },
    ],
    Titling: [
        {
            title: 'subHead 1',
            variant: 'subHead1',
            text: 'Everyone has the right to an effective remedy by the competent national tribunals for acts violating the fundamental rights granted him by the constitution or by law.',
        },
        {
            title: 'subHead 2',
            variant: 'subHead2',
            text: 'No one shall be subjected to arbitrary arrest, detention or exile. Everyone is entitled in full equality to a fair and public hearing by an independent and impartial tribunal, in the determination of his rights and obligations and of any criminal charge against him.',
        },
        {
            title: 'overline',
            variant: 'overline',
            text: 'Everyone has the right to an effective remedy',
        },
        {
            title: 'section heading',
            variant: 'sectionHeading',
            text: 'Everyone is entitled in full equality to a fair and public hearing.',
        },
    ],
    Body: [
        {
            title: 'body1',
            variant: 'body1',
            text: 'No one shall be subjected to arbitrary arrest, detention or exile. Everyone is entitled in full equality to a fair and public hearing by an independent and impartial tribunal, in the determination of his rights and obligations and of any criminal charge against him. No one shall be subjected to arbitrary interference with his privacy, family, home or correspondence, nor to attacks upon his honour and reputation. Everyone has the right to the protection of the law against such interference or attacks.',
        },
        {
            title: 'body2',
            variant: 'body2',
            text: 'No one shall be subjected to arbitrary arrest, detention or exile. Everyone is entitled in full equality to a fair and public hearing by an independent and impartial tribunal, in the determination of his rights and obligations and of any criminal charge against him. No one shall be subjected to arbitrary interference with his privacy, family, home or correspondence, nor to attacks upon his honour and reputation. Everyone has the right to the protection of the law against such interference or attacks.',
        },
        {
            title: 'caption',
            variant: 'caption',
            text: 'No one shall be subjected to arbitrary arrest, detention or exile. Everyone is entitled in full equality to a fair and public hearing by an independent and impartial tribunal, in the determination of his rights and obligations and of any criminal charge against him. No one shall be subjected to arbitrary interference with his privacy, family, home or correspondence, nor to attacks upon his honour and reputation. Everyone has the right to the protection of the law against such interference or attacks.',
        },
    ],
    Actions: [
        {
            title: 'Button Large',
            variant: 'buttonLarge',
            text: 'Whereas recognition',
            style: {
                fontFamily: 'Poppins',
                fontSize: '15px',
                fontWeight: '600',
                lineHeight: '15.94px',
                color: '#2C323E'
            }
        },
        {
            title: 'Button Medium',
            variant: 'buttonMedium',
            text: 'Whereas recognition',
            style: {
                fontFamily: 'Poppins',
                fontSize: '13px',
                fontWeight: '600',
                lineHeight: '14.82px',
                color: '#2C323E'
            }
        },
        {
            title: 'Button small',
            variant: 'buttonSmall',
            text: 'Whereas recognition',
            style: {
                fontFamily: 'Poppins',
                fontSize: '13px',
                fontWeight: '600',
                lineHeight: '14.82px',
                color: '#2C323E'
            }
        },
        {
            title: 'Menu Text',
            variant: 'menuText',
            text: 'Whereas recognition',
            style: {
                fontFamily: 'Poppins',
                fontSize: '14px',
                fontWeight: '600',
                lineHeight: '17.5px',
                color: '#2C323E'
            }
        },
        {
            title: 'Body 1 link',
            variant: 'body1',
            text: 'Whereas recognition',
            style: {
                fontFamily: 'Poppins',
                fontSize: '16px',
                fontWeight: '400',
                lineHeight: '22px',
                color: '#4B5468',
                textDecoration: 'underline',
            }
        },
        {
            title: 'Body 2 link',
            variant: 'body2',
            text: 'Whereas recognition',
            style: {
                fontFamily: 'Poppins',
                fontSize: '15px',
                fontWeight: '600',
                lineHeight: '15.94px',
                color: '#4B5468',
                textDecoration: 'underline',
            }
        },

    ],
    Inputs: [
        {
            title: 'Input text',
            variant: 'inputText',
            text: 'Whereas recognition'
        },
        {
            title: 'Input label',
            variant: 'inputLabel',
            text: 'Whereas recognition'
        },
        {
            title: 'Helper text',
            variant: 'helperText',
            text: 'Whereas recognition'
        },
    ]
}