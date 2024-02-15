import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import type { Block } from 'types/api/block';
import type { Transaction } from 'types/api/transaction';

import dayjs from 'lib/date/dayjs';
import hexToDecimal from 'lib/hexToDecimal';
import { publicClient } from 'lib/web3/client';
import { unknownAddress } from 'ui/shared/address/utils';

import type { ResourceError, ResourceName, ResourcePayload } from './resources';
import type { Params as ApiFetchParams } from './useApiFetch';
import useApiFetch from './useApiFetch';

export interface Params<R extends ResourceName, E = unknown> extends ApiFetchParams<R> {
  queryOptions?: Omit<UseQueryOptions<ResourcePayload<R>, ResourceError<E>, ResourcePayload<R>>, 'queryKey' | 'queryFn'>;
}

export function getResourceKey<R extends ResourceName>(resource: R, { pathParams, queryParams }: Params<R> = {}) {
  if (pathParams || queryParams) {
    return [ resource, { ...pathParams, ...queryParams } ];
  }

  return [ resource ];
}

export default function useApiQuery<R extends ResourceName, E = unknown>(
  resource: R,
  { queryOptions, pathParams, queryParams, fetchParams }: Params<R, E> = {},
) {
  const apiFetch = useApiFetch();

  return useQuery<ResourcePayload<R>, ResourceError<E>, ResourcePayload<R>>({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: getResourceKey(resource, { pathParams, queryParams }),
    queryFn: async() => {
      // all errors and error typing is handgitled by react-query
      // so error response will never go to the data
      // that's why we are safe here to do type conversion "as Promise<ResourcePayload<R>>"
      // console.log('queryOptions = ', queryOptions, ', path = ', pathParams, ', query = ', queryParams, ', fetch = ', fetchParams, ', resource = ', resource);
      if (resource === 'blocks') {
        let curBlockNumber = 0;
        let itemsCount = 50;
        if (queryParams && Boolean(queryParams.block_number)) {
          curBlockNumber = queryParams.block_number as number;
          itemsCount = queryParams.items_count as number;
        } else {
          const block = await publicClient.getBlock();
          curBlockNumber = Number(block.number);
        }

        const data = {
          items: [] as Array<Block>,
          next_page_params: {
            block_number: curBlockNumber - itemsCount > 0 ? curBlockNumber - itemsCount : 0,
            items_count: itemsCount,
          },
        };

        const promises = [];
        while (curBlockNumber >= 1 && itemsCount > 0) {
          itemsCount -= 1;
          curBlockNumber -= 1;
          const blockParams = { blockNumber: BigInt(curBlockNumber) };
          const promise = publicClient.getBlock(blockParams).then((block) => {
            return {
              height: Number(block.number),
              timestamp: dayjs.unix(Number(block.timestamp)).format(),
              tx_count: block.transactions.length,
              miner: { ...unknownAddress, hash: block.miner },
              size: Number(block.size),
              hash: block.hash,
              parent_hash: block.parentHash,
              difficulty: block.difficulty.toString(),
              total_difficulty: block.totalDifficulty?.toString() ?? null,
              gas_used: block.gasUsed.toString(),
              gas_limit: block.gasLimit.toString(),
              nonce: block.nonce,
              base_fee_per_gas: block.baseFeePerGas?.toString() || '0',
              burnt_fees: null,
              priority_fee: null,
              extra_data: block.extraData,
              state_root: block.stateRoot,
              gas_target_percentage: null,
              gas_used_percentage: null,
              burnt_fees_percentage: null,
              type: 'block',
              tx_fees: null,
              uncles_hashes: block.uncles,
              withdrawals_count: block.withdrawals?.length,
            };
          });
          promises.push(promise);
        }

        const items = await Promise.all(promises);
        data.items = items as Array<Block>;

        return Promise.resolve(data as ResourcePayload<R>);
      } else if (resource === 'txs_validated') {
        const MaxItem = 400;
        let curBlockNumber = 0;
        let itemsCount = 100;
        const latestBlock = await publicClient.getBlock();
        if (queryParams && Boolean(queryParams.block_number)) {
          curBlockNumber = queryParams.block_number as number;
          itemsCount = queryParams.items_count as number;
        } else {
          curBlockNumber = Number(latestBlock.number);
        }

        const data = {
          items: [] as Array<Transaction>,
          next_page_params: {
            block_number: 0,
            items_count: itemsCount,
          },
        };

        const items = [];
        while (curBlockNumber >= 1 && itemsCount > 0 && items.length <= MaxItem) {
          itemsCount -= 1;
          curBlockNumber -= 1;
          const blockParams = { blockNumber: BigInt(curBlockNumber), includeTransactions: true };
          const block = await publicClient.getBlock(blockParams);
          const txs = block.transactions
            .map((tx) => {
              if (typeof tx === 'string') {
                return;
              }

              return {
                from: { ...unknownAddress, hash: tx.from as string },
                to: tx.to ? { ...unknownAddress, hash: tx.to as string } : null,
                hash: tx.hash as string,
                timestamp: block?.timestamp ? dayjs.unix(Number(block.timestamp)).format() : null,
                confirmation_duration: null,
                status: undefined,
                block: Number(block.number),
                value: tx.value.toString(),
                gas_price: tx.gasPrice?.toString() ?? null,
                base_fee_per_gas: block?.baseFeePerGas?.toString() ?? null,
                max_fee_per_gas: tx.maxFeePerGas?.toString() ?? null,
                max_priority_fee_per_gas: tx.maxPriorityFeePerGas?.toString() ?? null,
                nonce: tx.nonce,
                position: tx.transactionIndex,
                type: tx.typeHex ? hexToDecimal(tx.typeHex) : null,
                raw_input: tx.input,
                gas_used: null,
                gas_limit: tx.gas.toString(),
                confirmations: Number(latestBlock.number - block.number + BigInt(1)),
                fee: {
                  value: null,
                  type: 'actual',
                },
                created_contract: null,
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
            .filter(Boolean);

          items.push(...txs);
        }

        const promises = [];
        for (const item of items) {
          const promise = publicClient.getTransactionReceipt({ hash: item.hash as `0x${ string }` }).then((receipt) => {
            return receipt;
          });
          promises.push(promise);
        }
        const receipts = await Promise.all(promises);
        if (items.length === receipts.length) {
          for (let i = 0; i < items.length; i++) {
            const txReceipt = receipts[i];
            const tx = items[i];
            const status = (() => {
              if (!txReceipt) {
                return null;
              }
              return txReceipt.status === 'success' ? 'ok' : 'error';
            })();

            const gasPrice = txReceipt?.effectiveGasPrice ?? tx.gas_price;
            tx.status = status;
            tx.gas_price = gasPrice?.toString() ?? null;
            tx.gas_used = txReceipt?.gasUsed?.toString() ?? null;
            tx.fee.value = txReceipt && gasPrice ? (txReceipt.gasUsed * BigInt(gasPrice)).toString() : null;
            tx.created_contract = txReceipt?.contractAddress ? { ...unknownAddress, hash: txReceipt.contractAddress, is_contract: true } : null;
          }
        }

        data.items = items as Array<Transaction>;
        data.next_page_params.block_number = curBlockNumber;

        return Promise.resolve(data as ResourcePayload<R>);
      }

      const data = apiFetch(resource, { pathParams, queryParams, fetchParams }) as Promise<ResourcePayload<R>>;
      return data;
    },
    ...queryOptions,
  });
}
