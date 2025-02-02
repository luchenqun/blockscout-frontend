import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import type { Chain, GetBlockReturnType, TransactionReceipt } from 'viem';

import type { BlockTransactionsResponse } from 'types/api/block';
import type { Transaction } from 'types/api/transaction';

import type { ResourceError } from 'lib/api/resources';
import dayjs from 'lib/date/dayjs';
import hexToDecimal from 'lib/hexToDecimal';
import { publicClient } from 'lib/web3/client';
import { GET_BLOCK_WITH_TRANSACTIONS, GET_TRANSACTION_RECEIPTS } from 'stubs/RPC';
import { unknownAddress } from 'ui/shared/address/utils';
import type { QueryWithPagesResult } from 'ui/shared/pagination/useQueryWithPages';
import { emptyPagination } from 'ui/shared/pagination/utils';

import type { BlockQuery } from './useBlockQuery';

type RpcResponseType = [
  GetBlockReturnType<Chain, boolean, 'latest'>,
  Array<TransactionReceipt>
] | null;

export type BlockTxsQuery = QueryWithPagesResult<'block_txs'> & {
  isDegradedData: boolean;
};

interface Params {
  heightOrHash: string;
  blockQuery: BlockQuery;
  tab: string;
}

export default function useBlockTxQuery({ heightOrHash, blockQuery, tab }: Params): BlockTxsQuery {
  const rpcQuery = useQuery<RpcResponseType, unknown, BlockTransactionsResponse | null>({
    queryKey: [ 'RPC', 'block_txs', { heightOrHash } ],
    queryFn: async() => {
      const blockParams = heightOrHash.startsWith('0x') ?
        { blockHash: heightOrHash as `0x${ string }`, includeTransactions: true } :
        { blockNumber: BigInt(heightOrHash), includeTransactions: true };
      const block = await publicClient.getBlock(blockParams).catch(() => null);
      const promises = [];
      if (block) {
        const items = block.transactions
          .map((tx) => {
            if (typeof tx === 'string') {
              return;
            }
            return tx;
          }).filter(Boolean);

        for (const item of items) {
          const promise = publicClient.getTransactionReceipt({ hash: item.hash as `0x${ string }` }).then((receipt) => {
            return receipt;
          });
          promises.push(promise);
        }

        const receipts = await Promise.all(promises);
        return [ block, receipts ];
      }

      return null;
    },
    select: (response) => {
      if (!response) {
        return null;
      }

      const receipts = response[1] as Array<TransactionReceipt>;
      const block = response[0] as GetBlockReturnType<Chain, boolean, 'latest'>;

      return {
        items: block.transactions
          .map((tx, i) => {
            if (typeof tx === 'string') {
              return;
            }

            const receipt = receipts[i];

            const status = (() => {
              if (!receipt) {
                return null;
              }
              return receipt.status === 'success' ? 'ok' : 'error';
            })();

            const gasPrice = receipt?.effectiveGasPrice ?? tx.gasPrice;

            return {
              from: { ...unknownAddress, hash: tx.from as string },
              to: tx.to ? { ...unknownAddress, hash: tx.to as string } : null,
              hash: tx.hash as string,
              timestamp: block?.timestamp ? dayjs.unix(Number(block.timestamp)).format() : null,
              confirmation_duration: null,
              status,
              block: Number(block.number),
              value: tx.value.toString(),
              gas_price: gasPrice.toString() ?? null,
              base_fee_per_gas: block?.baseFeePerGas?.toString() ?? null,
              max_fee_per_gas: tx.maxFeePerGas?.toString() ?? null,
              max_priority_fee_per_gas: tx.maxPriorityFeePerGas?.toString() ?? null,
              nonce: tx.nonce,
              position: tx.transactionIndex,
              type: tx.typeHex ? hexToDecimal(tx.typeHex) : null,
              raw_input: tx.input,
              gas_used: receipt?.gasUsed?.toString() ?? null,
              gas_limit: tx.gas.toString(),
              confirmations: 0,
              fee: {
                value: receipt && gasPrice ? (receipt.gasUsed * BigInt(gasPrice)).toString() : null,
                type: 'actual',
              },
              created_contract: receipt?.contractAddress ? { ...unknownAddress, hash: receipt.contractAddress, is_contract: true } : null,
              result: '',
              priority_fee: null,
              tx_burnt_fee: null,
              revert_reason: null,
              decoded_input: null,
              has_error_in_internal_txs: null,
              token_transfers: null,
              token_transfers_overflow: false,
              exchange_rate: null,
              method: null,
              tx_types: [],
              tx_tag: null,
              actions: [],
            } as Transaction;
          })
          .filter(Boolean),
        next_page_params: null,
      };
    },
    placeholderData: [ GET_BLOCK_WITH_TRANSACTIONS, GET_TRANSACTION_RECEIPTS ],
    enabled: tab === 'txs' && blockQuery.isDegradedData,
    retry: false,
    refetchOnMount: false,
  });

  const rpcQueryWithPages: QueryWithPagesResult<'block_txs'> = React.useMemo(() => {
    return {
      ...rpcQuery as UseQueryResult<BlockTransactionsResponse, ResourceError>,
      pagination: emptyPagination,
      onFilterChange: () => {},
      onSortingChange: () => {},
    };
  }, [ rpcQuery ]);

  const query = rpcQueryWithPages;

  return {
    ...query,
    isDegradedData: true,
  };
}
