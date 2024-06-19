import FilterListIcon from '@mui/icons-material/FilterList';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { Alert } from '@mui/material';
import { MaterialReactTable, MRT_VisibilityState } from 'material-react-table';
import { useEffect } from 'react';
import { ICONS_OPACITY } from './table.constants';
import { TableProps } from './table.types';
import usePersistentColumnVisibility from './usePersistentColumnVisibility';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Table<T extends Record<string, any>>(props: TableProps<T>) {
  const {
    data,
    columns,
    muiTablePaperProps,
    muiTopToolbarProps,
    displayColumnDefOptions,
    noDataMessage,
    emptyFilterResultsMessage = 'No data found',
    hideExpandAllIcon,
    tableName,
    state,
    initialState,
    ...rest
  } = props;
  const [columnVisibility, setColumnVisibility] =
    usePersistentColumnVisibility(tableName);

  let columnVisibilityState: MRT_VisibilityState | undefined = {};
  let restOfState = {};

  if (state) {
    const { columnVisibility: cv, ...rest } = state;
    columnVisibilityState = cv;
    restOfState = rest;
  }

  const stopPropagation = (e: Event) => {
    e.stopPropagation();
  };

  // @ts-expect-error
  const { sx: muiTopToolbarPropsSx = {}, ...muiTopToolbarRestProps } =
    muiTopToolbarProps || {};

  useEffect(() => {
    const hideColumnsIcon = document.querySelector(
      '[aria-label="Show/Hide columns"]'
    );
    const showFiltesIcon = document.querySelector(
      '[aria-label="Show/Hide filters"]'
    );
    const globalFilterIcon = document.querySelector(
      '[aria-label="Show/Hide search"]'
    );
    const elementsWithExpandLabel = document.querySelectorAll(
      '[aria-label="Column Actions"]'
    );

    if (!data.length) {
      hideColumnsIcon?.addEventListener('click', stopPropagation);
      showFiltesIcon?.addEventListener('click', stopPropagation);
      globalFilterIcon?.addEventListener('click', stopPropagation);
      elementsWithExpandLabel.forEach((element) => {
        element.addEventListener('click', stopPropagation);
      });
    }

    return () => {
      globalFilterIcon?.removeEventListener('click', stopPropagation);
      showFiltesIcon?.removeEventListener('click', stopPropagation);
      hideColumnsIcon?.removeEventListener('click', stopPropagation);
      elementsWithExpandLabel.forEach((element) => {
        element.removeEventListener('click', stopPropagation);
      });
    };
  }, [data]);

  // disable hiding for first 2 columns
  const customColumns = columns.map((col, index) => {
    if (index < 2) {
      return { ...col, enableHiding: false };
    }
    return col;
  });

  return (
    <MaterialReactTable
      renderEmptyRowsFallback={({ table: { getPreFilteredRowModel } }) => (
        <Alert
          severity="info"
          sx={{
            width: '100%',
            height: '50px',
            marginTop: 1,
            marginBottom: 1,
          }}
        >
          {/* This means there was data before filtering, so we show the message of empty filtering result */}
          {getPreFilteredRowModel().rows.length > 0
            ? emptyFilterResultsMessage
            : noDataMessage}
        </Alert>
      )}
      layoutMode="grid"
      enablePagination={data.length > 10}
      enableBottomToolbar={data.length > 10}
      enableDensityToggle={false}
      enableFullScreenToggle={false}
      enableSorting={!!data.length}
      autoResetAll={false}
      onColumnVisibilityChange={setColumnVisibility}
      icons={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        KeyboardDoubleArrowDownIcon: (propsIcon: any) =>
          data.length ? (
            <KeyboardDoubleArrowDownIcon {...propsIcon} />
          ) : (
            <KeyboardDoubleArrowDownIcon sx={{ opacity: ICONS_OPACITY }} />
          ),
        SearchIcon: () => (
          <SearchIcon sx={{ opacity: !data.length ? ICONS_OPACITY : 1 }} />
        ),
        FilterListIcon: () => (
          <FilterListIcon sx={{ opacity: !data.length ? ICONS_OPACITY : 1 }} />
        ),
        ViewColumnIcon: () => (
          <ViewColumnIcon sx={{ opacity: !data.length ? ICONS_OPACITY : 1 }} />
        ),
        MoreVertIcon: () => (
          <MoreVertIcon sx={{ opacity: !data.length ? ICONS_OPACITY : 1 }} />
        ),
      }}
      positionActionsColumn="last"
      positionExpandColumn="last"
      muiTablePaperProps={{ elevation: 0, ...muiTablePaperProps }}
      muiTopToolbarProps={{
        sx: {
          backgroundColor: 'transparent',
          '& > .MuiBox-root': {
            flexDirection: 'row-reverse',
            flexWrap: 'wrap',
          },
          ...muiTopToolbarPropsSx,
        },
        ...muiTopToolbarRestProps,
      }}
      displayColumnDefOptions={{
        'mrt-row-actions': {
          size: 30,
          muiTableBodyCellProps: {
            sx: {
              flex: 'none',
              width: '75px',
              ...// @ts-ignore
              // prettier-ignore
              displayColumnDefOptions?.['mrt-row-actions']
                // @ts-ignore
                ?.muiTableBodyCellProps?.sx,
            },
            ...displayColumnDefOptions?.['mrt-row-actions']
              ?.muiTableBodyCellProps,
          },
          muiTableHeadCellProps: {
            sx: {
              flex: 'none',
              width: '75px',
              // We could simply set "mrt-row-actions.header" to ""
              // However, MRT takes that string and shows it in the show/hide columns menu
              // By doing this, we still have "Actions" in that menu, but no text (i.e. transparent) in the header cell
              color: 'transparent',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
              ...// @ts-ignore
              // prettier-ignore
              displayColumnDefOptions?.['mrt-row-actions']
              // @ts-ignore
                ?.muiTableHeadCellProps?.sx,
            },
            ...displayColumnDefOptions?.['mrt-row-actions']
              ?.muiTableHeadCellProps,
          },
          ...displayColumnDefOptions?.['mrt-row-actions'],
        },
        'mrt-row-expand': {
          size: 40,
          muiTableBodyCellProps: {
            sx: {
              flex: 'none',
              width: '60px',
              ...// @ts-ignore
              // prettier-ignore
              displayColumnDefOptions?.['mrt-row-expand']?.muiTableBodyCellProps
                // @ts-ignore
                ?.sx,
            },
            ...displayColumnDefOptions?.['mrt-row-expand']
              ?.muiTableBodyCellProps,
          },
          muiTableHeadCellProps: {
            sx: {
              flex: 'none',
              width: '60px',
              ...(!!hideExpandAllIcon && {
                '& button': {
                  display: 'none',
                },
              }),
              ...// @ts-ignore
              // prettier-ignore
              displayColumnDefOptions?.['mrt-row-expand']?.muiTableHeadCellProps
              // @ts-ignore
                ?.sx,
            },
            ...displayColumnDefOptions?.['mrt-row-expand']
              ?.muiTableHeadCellProps,
          },
          ...displayColumnDefOptions?.['mrt-row-expand'],
        },
        ...displayColumnDefOptions,
      }}
      muiTableHeadProps={{
        sx: {
          '& tr': {
            backgroundColor: 'transparent',
          },
        },
      }}
      muiTableBodyProps={{
        sx: {
          '& tr': {
            backgroundColor: 'transparent',
          },
        },
      }}
      muiTableDetailPanelProps={{
        sx: {
          width: '100%',
        },
      }}
      {...rest}
      columns={customColumns}
      data={data}
      state={{
        columnVisibility: { ...columnVisibility, ...columnVisibilityState },
        ...restOfState,
      }}
      initialState={{
        columnVisibility,
        ...initialState,
      }}
    />
  );
}

export default Table;
