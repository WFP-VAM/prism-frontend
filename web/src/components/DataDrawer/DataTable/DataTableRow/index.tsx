import React from 'react';
import { TableRow, TableCell } from '@material-ui/core';
import { TableRowType } from '../../../../context/tableStateSlice';

export interface TableRowProps {
  className?: string;
  columns: string[];
  rowData?: TableRowType;
}

const DataTableRow = ({ className, columns, rowData }: TableRowProps) => (
  <TableRow>
    {columns.map(column => (
      <TableCell className={className} key={column}>
        {' '}
        {rowData ? rowData[column] : column}{' '}
      </TableCell>
    ))}
  </TableRow>
);

export default DataTableRow;
