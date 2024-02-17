import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { Chain, GetBlockReturnType } from 'viem';

import type { Block } from 'types/api/block';
import type { Transaction } from 'types/api/transaction';

import dayjs from 'lib/date/dayjs';
import hexToDecimal from 'lib/hexToDecimal';
import { publicClient } from 'lib/web3/client';
import { ADDRESS_TABS_COUNTERS, ADDRESS_COUNTERS } from 'stubs/address';
import { GET_BLOCK } from 'stubs/RPC';
import { USER_OPS_ACCOUNT } from 'stubs/userOps';
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
        let itemsCount = 50; // query block count
        if (queryParams && Boolean(queryParams.block_number)) {
          curBlockNumber = queryParams.block_number as number;
          itemsCount = queryParams.items_count as number;
        } else {
          const latestBlockNumber = await publicClient.getBlockNumber({ cacheTime: 0 }).catch(() => BigInt(0));
          curBlockNumber = Number(latestBlockNumber);
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

          itemsCount -= 1;
          curBlockNumber -= 1;
        }

        const items = await Promise.all(promises);
        data.items = items as Array<Block>;

        return Promise.resolve(data as ResourcePayload<R>);
      } else if (resource === 'txs_validated') {
        const MaxItem = 200; // If 200 transactions are found, the query will be terminated.
        let curBlockNumber = 0;
        let itemsCount = 300; // query block count
        let latestBlockNumber = BigInt(0);
        if (queryParams && Boolean(queryParams.block_number)) {
          curBlockNumber = queryParams.block_number as number;
          itemsCount = queryParams.items_count as number;
        } else {
          latestBlockNumber = await publicClient.getBlockNumber({ cacheTime: 0 }).catch(() => BigInt(0));
          curBlockNumber = Number(latestBlockNumber);
        }

        const data = {
          items: [] as Array<Transaction>,
          next_page_params: {
            block_number: 0,
            items_count: itemsCount,
          },
        };

        const items = [];
        while (curBlockNumber >= 1 && itemsCount > 0 && items.length < MaxItem) {
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
                confirmations: Number(latestBlockNumber - block.number + BigInt(1)),
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

          itemsCount -= 1;
          curBlockNumber -= 1;
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
      } else if (resource === 'quick_search') {
        if (queryParams && Boolean(queryParams.q)) {
          let block: GetBlockReturnType<Chain, boolean, 'latest'> | undefined;

          let query = queryParams.q as string;
          if (query.startsWith('0x')) {
            if (query.length === 64 || query.length === 40) {
              query = '0x' + query;
            }

            if (query.length === 42) {
              const data: unknown = [
                {
                  address: query,
                  ens_info: null,
                  is_smart_contract_verified: false,
                  name: null,
                  type: 'address',
                  url: `/address/${ query }`,
                },
              ];
              return Promise.resolve(data as ResourcePayload<R>);
            }

            if (query.length === 66) {
              // search tx receipt
              const receipt = await publicClient.getTransactionReceipt({ hash: query as `0x${ string }` }).catch(() => null);
              if (receipt) {
                const blockParams = { blockNumber: receipt.blockNumber, includeTransactions: true };
                const block = await publicClient.getBlock(blockParams);

                const data: unknown = [ {
                  timestamp: dayjs.unix(Number(block.timestamp)).format(),
                  tx_hash: receipt.transactionHash,
                  type: 'transaction',
                  url: `/tx/${ receipt.transactionHash }`,
                } ];
                return Promise.resolve(data as ResourcePayload<R>);
              }

              // search block
              const blockParams = { blockHash: query as `0x${ string }`, includeTransactions: false };
              block = await publicClient.getBlock(blockParams).catch(() => undefined);
            }
          } else if (/^[1-9]\d*$/.test(query)) {
            const blockParams = { blockNumber: BigInt(query), includeTransactions: false };
            block = await publicClient.getBlock(blockParams).catch(() => undefined);
          }

          if (block) {
            const data: unknown = [ {
              block_hash: block.hash,
              block_number: Number(block.number),
              block_type: 'block',
              timestamp: dayjs.unix(Number(block.timestamp)).format(),
              type: 'block',
              url: `/block/${ block.hash }`,
            } ];
            return Promise.resolve(data as ResourcePayload<R>);
          }

          return Promise.resolve([] as unknown as ResourcePayload<R>);
        }
      } else if (resource === 'homepage_stats') {
        const latestBlock = await publicClient.getBlock({ blockTag: 'latest' }).catch(() => GET_BLOCK);
        const firstBlock = await publicClient.getBlock({ blockNumber: BigInt(1), includeTransactions: false }).catch(() => GET_BLOCK);
        const totalBlockTime = latestBlock?.timestamp - firstBlock?.timestamp;
        const blockGap = latestBlock.number - firstBlock.number;
        const averageBlockTime: number = blockGap > 0 ? Math.ceil(Number(totalBlockTime) / Number(blockGap) * 1000) : 0;

        const data: unknown = {
          average_block_time: averageBlockTime,
          coin_image: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png?1696501628',
          coin_price: '2812.75',
          coin_price_change_percentage: 1.8,
          gas_price_updated_at: '2024-02-16T09:16:07.074312Z',
          gas_prices: undefined && {
            average: {
              fiat_price: '1.78',
              price: 30.16,
              time: 12178.475,
            },
            fast: {
              fiat_price: '11.31',
              price: 191.54,
              time: 12178.475,
            },
            slow: {
              fiat_price: '1.73',
              price: 29.31,
              time: 12178.475,
            },
          },
          gas_prices_update_in: 219372,
          gas_used_today: '107909845451',
          market_cap: '337995780402.04624100',
          network_utilization_percentage: 51.19167076000339,
          static_gas_price: null,
          total_addresses: '320537603',
          total_blocks: latestBlock.number.toString(),
          total_gas_used: '0',
          total_transactions: '2263617705',
          transactions_today: '1153655',
          rootstock_locked_btc: undefined,
          tvl: null,
          base_fee_per_gas: latestBlock.baseFeePerGas?.toString() || '0',
        };
        return Promise.resolve(data as ResourcePayload<R>);
      } else if (resource === 'homepage_blocks') {
        let itemsCount = 5;
        let curBlockNumber = await publicClient.getBlockNumber({ cacheTime: 0 }).catch(() => BigInt(0));

        let data: Array<Block> = [ ];
        if (curBlockNumber) {
          const promises = [];
          while (curBlockNumber >= 1 && itemsCount > 0) {
            const blockParams = { blockNumber: curBlockNumber };
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
              } as Block;
            });
            promises.push(promise);

            itemsCount -= 1;
            curBlockNumber = curBlockNumber - BigInt(1);
          }

          data = await Promise.all(promises);
        }
        return Promise.resolve(data as ResourcePayload<R>);
      } else if (resource === 'homepage_txs') {
        const MaxItem = 6;
        const latestBlockNumber = await publicClient.getBlockNumber({ cacheTime: 0 }).catch(() => BigInt(0));

        let itemsCount = 300;
        let curBlockNumber = Number(latestBlockNumber);

        let items = [];
        while (curBlockNumber >= 1 && itemsCount > 0 && items.length < MaxItem) {
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
                confirmations: Number(latestBlockNumber - block.number + BigInt(1)),
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

          itemsCount -= 1;
          curBlockNumber -= 1;
        }
        items = items.slice(0, MaxItem);

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

        return Promise.resolve(items as ResourcePayload<R>);
      } else if (resource === 'address') {
        if (pathParams) {
          const address = (pathParams as unknown as { hash: string }).hash as `0x${ string }`;
          const nonce = await publicClient.getTransactionCount({ address });
          const balance = await publicClient.getBalance({ address });
          const code = await publicClient.getBytecode({ address });

          const data: unknown = {
            block_number_balance_updated_at: null,
            coin_balance: balance.toString(),
            creation_tx_hash: null,
            creator_address_hash: null,
            ens_domain_name: null,
            exchange_rate: '2790.93',
            has_beacon_chain_withdrawals: false,
            has_custom_methods_read: false,
            has_custom_methods_write: false,
            has_decompiled_code: false,
            has_logs: false,
            has_methods_read: true,
            has_methods_read_proxy: false,
            has_methods_write: true,
            has_methods_write_proxy: false,
            has_token_transfers: false,
            has_tokens: false,
            has_validated_blocks: false,
            hash: address,
            implementation_address: null,
            implementation_name: null,
            is_contract: Boolean(code),
            is_verified: true,
            name: null,
            private_tags: [

            ],
            public_tags: [

            ],
            token: null,
            watchlist_address_id: null,
            watchlist_names: [

            ],
            nonce,
            code,
          };

          return Promise.resolve(data as ResourcePayload<R>);
        }

      } else if (resource === 'address_txs') {
        const address = (pathParams as unknown as { hash: string }).hash.toLowerCase() as `0x${ string }`;
        const MaxItem = 50; // If 200 transactions are found, the query will be terminated.
        let curBlockNumber = 0;
        let itemsCount = 300; // query block count
        let latestBlockNumber = BigInt(0);
        if (queryParams && Boolean(queryParams.block_number)) {
          curBlockNumber = queryParams.block_number as number;
          itemsCount = queryParams.items_count as number;
        } else {
          latestBlockNumber = await publicClient.getBlockNumber({ cacheTime: 0 }).catch(() => BigInt(0));
          curBlockNumber = Number(latestBlockNumber);
        }

        const data = {
          items: [] as Array<Transaction>,
          next_page_params: {
            block_number: 0,
            items_count: itemsCount,
          },
        };

        let items = [];
        while (curBlockNumber >= 1 && itemsCount > 0 && items.length < MaxItem) {
          const blockParams = { blockNumber: BigInt(curBlockNumber), includeTransactions: true };
          const block = await publicClient.getBlock(blockParams);
          const txs = block.transactions
            .map((tx) => {
              if (typeof tx === 'string') {
                return;
              }

              if (tx.from.toLowerCase() as string !== address && (tx.to && tx.to?.toLowerCase() !== address)) {
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
                confirmations: Number(latestBlockNumber - block.number + BigInt(1)),
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

          itemsCount -= 1;
          curBlockNumber -= 1;
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

        items = items.filter(
          item => item.from.hash.toLowerCase() === address ||
        item.to?.hash.toLowerCase() === address ||
        item.created_contract?.hash.toLowerCase() === address,
        );

        data.items = items as Array<Transaction>;
        data.next_page_params.block_number = curBlockNumber;

        return Promise.resolve(data as ResourcePayload<R>);
      } else if (resource === 'contract') {
        const data: unknown = {
          abi: [
            {
              constant: true,
              inputs: [],
              name: 'name',
              outputs: [
                {
                  name: '',
                  type: 'string',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: false,
              inputs: [
                {
                  name: '_upgradedAddress',
                  type: 'address',
                },
              ],
              name: 'deprecate',
              outputs: [],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              constant: false,
              inputs: [
                {
                  name: '_spender',
                  type: 'address',
                },
                {
                  name: '_value',
                  type: 'uint256',
                },
              ],
              name: 'approve',
              outputs: [],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              constant: true,
              inputs: [],
              name: 'deprecated',
              outputs: [
                {
                  name: '',
                  type: 'bool',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: false,
              inputs: [
                {
                  name: '_evilUser',
                  type: 'address',
                },
              ],
              name: 'addBlackList',
              outputs: [],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              constant: true,
              inputs: [],
              name: 'totalSupply',
              outputs: [
                {
                  name: '',
                  type: 'uint256',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: false,
              inputs: [
                {
                  name: '_from',
                  type: 'address',
                },
                {
                  name: '_to',
                  type: 'address',
                },
                {
                  name: '_value',
                  type: 'uint256',
                },
              ],
              name: 'transferFrom',
              outputs: [],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              constant: true,
              inputs: [],
              name: 'upgradedAddress',
              outputs: [
                {
                  name: '',
                  type: 'address',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: true,
              inputs: [
                {
                  name: '',
                  type: 'address',
                },
              ],
              name: 'balances',
              outputs: [
                {
                  name: '',
                  type: 'uint256',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: true,
              inputs: [],
              name: 'decimals',
              outputs: [
                {
                  name: '',
                  type: 'uint256',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: true,
              inputs: [],
              name: 'maximumFee',
              outputs: [
                {
                  name: '',
                  type: 'uint256',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: true,
              inputs: [],
              name: '_totalSupply',
              outputs: [
                {
                  name: '',
                  type: 'uint256',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: false,
              inputs: [],
              name: 'unpause',
              outputs: [],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              constant: true,
              inputs: [
                {
                  name: '_maker',
                  type: 'address',
                },
              ],
              name: 'getBlackListStatus',
              outputs: [
                {
                  name: '',
                  type: 'bool',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: true,
              inputs: [
                {
                  name: '',
                  type: 'address',
                },
                {
                  name: '',
                  type: 'address',
                },
              ],
              name: 'allowed',
              outputs: [
                {
                  name: '',
                  type: 'uint256',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: true,
              inputs: [],
              name: 'paused',
              outputs: [
                {
                  name: '',
                  type: 'bool',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: true,
              inputs: [
                {
                  name: 'who',
                  type: 'address',
                },
              ],
              name: 'balanceOf',
              outputs: [
                {
                  name: '',
                  type: 'uint256',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: false,
              inputs: [],
              name: 'pause',
              outputs: [],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              constant: true,
              inputs: [],
              name: 'getOwner',
              outputs: [
                {
                  name: '',
                  type: 'address',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: true,
              inputs: [],
              name: 'owner',
              outputs: [
                {
                  name: '',
                  type: 'address',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: true,
              inputs: [],
              name: 'symbol',
              outputs: [
                {
                  name: '',
                  type: 'string',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: false,
              inputs: [
                {
                  name: '_to',
                  type: 'address',
                },
                {
                  name: '_value',
                  type: 'uint256',
                },
              ],
              name: 'transfer',
              outputs: [],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              constant: false,
              inputs: [
                {
                  name: 'newBasisPoints',
                  type: 'uint256',
                },
                {
                  name: 'newMaxFee',
                  type: 'uint256',
                },
              ],
              name: 'setParams',
              outputs: [],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              constant: false,
              inputs: [
                {
                  name: 'amount',
                  type: 'uint256',
                },
              ],
              name: 'issue',
              outputs: [],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              constant: false,
              inputs: [
                {
                  name: 'amount',
                  type: 'uint256',
                },
              ],
              name: 'redeem',
              outputs: [],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              constant: true,
              inputs: [
                {
                  name: '_owner',
                  type: 'address',
                },
                {
                  name: '_spender',
                  type: 'address',
                },
              ],
              name: 'allowance',
              outputs: [
                {
                  name: 'remaining',
                  type: 'uint256',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: true,
              inputs: [],
              name: 'basisPointsRate',
              outputs: [
                {
                  name: '',
                  type: 'uint256',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: true,
              inputs: [
                {
                  name: '',
                  type: 'address',
                },
              ],
              name: 'isBlackListed',
              outputs: [
                {
                  name: '',
                  type: 'bool',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: false,
              inputs: [
                {
                  name: '_clearedUser',
                  type: 'address',
                },
              ],
              name: 'removeBlackList',
              outputs: [],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              constant: true,
              inputs: [],
              name: 'MAX_UINT',
              outputs: [
                {
                  name: '',
                  type: 'uint256',
                },
              ],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
            {
              constant: false,
              inputs: [
                {
                  name: 'newOwner',
                  type: 'address',
                },
              ],
              name: 'transferOwnership',
              outputs: [],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              constant: false,
              inputs: [
                {
                  name: '_blackListedUser',
                  type: 'address',
                },
              ],
              name: 'destroyBlackFunds',
              outputs: [],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [
                {
                  name: '_initialSupply',
                  type: 'uint256',
                },
                {
                  name: '_name',
                  type: 'string',
                },
                {
                  name: '_symbol',
                  type: 'string',
                },
                {
                  name: '_decimals',
                  type: 'uint256',
                },
              ],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'constructor',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  name: 'amount',
                  type: 'uint256',
                },
              ],
              name: 'Issue',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  name: 'amount',
                  type: 'uint256',
                },
              ],
              name: 'Redeem',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  name: 'newAddress',
                  type: 'address',
                },
              ],
              name: 'Deprecate',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  name: 'feeBasisPoints',
                  type: 'uint256',
                },
                {
                  indexed: false,
                  name: 'maxFee',
                  type: 'uint256',
                },
              ],
              name: 'Params',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  name: '_blackListedUser',
                  type: 'address',
                },
                {
                  indexed: false,
                  name: '_balance',
                  type: 'uint256',
                },
              ],
              name: 'DestroyedBlackFunds',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  name: '_user',
                  type: 'address',
                },
              ],
              name: 'AddedBlackList',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  name: '_user',
                  type: 'address',
                },
              ],
              name: 'RemovedBlackList',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  name: 'owner',
                  type: 'address',
                },
                {
                  indexed: true,
                  name: 'spender',
                  type: 'address',
                },
                {
                  indexed: false,
                  name: 'value',
                  type: 'uint256',
                },
              ],
              name: 'Approval',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  name: 'from',
                  type: 'address',
                },
                {
                  indexed: true,
                  name: 'to',
                  type: 'address',
                },
                {
                  indexed: false,
                  name: 'value',
                  type: 'uint256',
                },
              ],
              name: 'Transfer',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [],
              name: 'Pause',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [],
              name: 'Unpause',
              type: 'event',
            },
          ],
          additional_sources: [],
          can_be_visualized_via_sol2uml: true,
          compiler_settings: {
            libraries: {},
            optimizer: {
              enabled: false,
              runs: 0,
            },
            remappings: [],
          },
          compiler_version: '0.4.18+commit.9cf6e910',
          constructor_args: '0x',
          creation_bytecode: '0x',
          decoded_constructor_args: null,
          deployed_bytecode: '0x',
          evm_version: 'default',
          external_libraries: [],
          file_path: 'TetherToken.sol',
          is_changed_bytecode: false,
          is_fully_verified: false,
          is_partially_verified: true,
          is_self_destructed: false,
          is_verified: true,
          is_verified_via_eth_bytecode_db: true,
          is_verified_via_sourcify: true,
          is_vyper_contract: false,
          language: 'solidity',
          minimal_proxy_address_hash: null,
          name: 'TetherToken',
          optimization_enabled: false,
          optimization_runs: null,
          source_code: 'hello code',
          sourcify_repo_url: 'https://repo.sourcify.dev/contracts/partial_match/1/0xdAC17F958D2ee523a2206206994597C13D831ec7/',
          verified_at: '2019-04-18T23:27:13.673983Z',
          verified_twin_address_hash: '0x35C159F736a9B24a46eD266df8c353b9e713AD2b',
        };
        return Promise.resolve(data as ResourcePayload<R>);
      } else if (resource === 'contract_methods_read') {
        const data: unknown = [
          {
            constant: true,
            inputs: [],
            method_id: '06fdde03',
            name: 'name',
            names: [
              null,
            ],
            outputs: [
              {
                type: 'string',
                value: 'Tether USD',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '0e136b19',
            name: 'deprecated',
            names: [
              null,
            ],
            outputs: [
              {
                type: 'bool',
                value: false,
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '18160ddd',
            name: 'totalSupply',
            names: [
              null,
            ],
            outputs: [
              {
                type: 'uint256',
                value: 1,
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '26976e3f',
            name: 'upgradedAddress',
            names: [
              null,
            ],
            outputs: [
              {
                type: 'address',
                value: '0x0000000000000000000000000000000000000000',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: '',
                type: 'address',
              },
            ],
            method_id: '27e235e3',
            name: 'balances',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '313ce567',
            name: 'decimals',
            names: [
              null,
            ],
            outputs: [
              {
                type: 'uint256',
                value: 6,
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '35390714',
            name: 'maximumFee',
            names: [
              null,
            ],
            outputs: [
              {
                type: 'uint256',
                value: 0,
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '3eaaf86b',
            name: '_totalSupply',
            names: [
              null,
            ],
            outputs: [
              {
                type: 'uint256',
                value: 1,
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: '_maker',
                type: 'address',
              },
            ],
            method_id: '59bf1abe',
            name: 'getBlackListStatus',
            outputs: [
              {
                name: '',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: '',
                type: 'address',
              },
              {
                name: '',
                type: 'address',
              },
            ],
            method_id: '5c658165',
            name: 'allowed',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '5c975abb',
            name: 'paused',
            names: [
              null,
            ],
            outputs: [
              {
                type: 'bool',
                value: false,
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: 'who',
                type: 'address',
              },
            ],
            method_id: '70a08231',
            name: 'balanceOf',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '893d20e8',
            name: 'getOwner',
            names: [
              null,
            ],
            outputs: [
              {
                type: 'address',
                value: '0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '8da5cb5b',
            name: 'owner',
            names: [
              null,
            ],
            outputs: [
              {
                type: 'address',
                value: '0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '95d89b41',
            name: 'symbol',
            names: [
              null,
            ],
            outputs: [
              {
                type: 'string',
                value: 'USDT',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: '_owner',
                type: 'address',
              },
              {
                name: '_spender',
                type: 'address',
              },
            ],
            method_id: 'dd62ed3e',
            name: 'allowance',
            outputs: [
              {
                name: 'remaining',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: 'dd644f72',
            name: 'basisPointsRate',
            names: [
              null,
            ],
            outputs: [
              {
                type: 'uint256',
                value: 0,
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: '',
                type: 'address',
              },
            ],
            method_id: 'e47d6060',
            name: 'isBlackListed',
            outputs: [
              {
                name: '',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: 'e5b5019a',
            name: 'MAX_UINT',
            names: [
              null,
            ],
            outputs: [
              {
                type: 'uint256',
                value: 1,
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '06fdde03',
            name: 'name',
            outputs: [
              {
                name: '',
                type: 'string',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '0e136b19',
            name: 'deprecated',
            outputs: [
              {
                name: '',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '18160ddd',
            name: 'totalSupply',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '26976e3f',
            name: 'upgradedAddress',
            outputs: [
              {
                name: '',
                type: 'address',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: '',
                type: 'address',
              },
            ],
            method_id: '27e235e3',
            name: 'balances',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '313ce567',
            name: 'decimals',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '35390714',
            name: 'maximumFee',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '3eaaf86b',
            name: '_totalSupply',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: '_maker',
                type: 'address',
              },
            ],
            method_id: '59bf1abe',
            name: 'getBlackListStatus',
            outputs: [
              {
                name: '',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: '',
                type: 'address',
              },
              {
                name: '',
                type: 'address',
              },
            ],
            method_id: '5c658165',
            name: 'allowed',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '5c975abb',
            name: 'paused',
            outputs: [
              {
                name: '',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: 'who',
                type: 'address',
              },
            ],
            method_id: '70a08231',
            name: 'balanceOf',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '893d20e8',
            name: 'getOwner',
            outputs: [
              {
                name: '',
                type: 'address',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '8da5cb5b',
            name: 'owner',
            outputs: [
              {
                name: '',
                type: 'address',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: '95d89b41',
            name: 'symbol',
            outputs: [
              {
                name: '',
                type: 'string',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: '_owner',
                type: 'address',
              },
              {
                name: '_spender',
                type: 'address',
              },
            ],
            method_id: 'dd62ed3e',
            name: 'allowance',
            outputs: [
              {
                name: 'remaining',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: 'dd644f72',
            name: 'basisPointsRate',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: '',
                type: 'address',
              },
            ],
            method_id: 'e47d6060',
            name: 'isBlackListed',
            outputs: [
              {
                name: '',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            method_id: 'e5b5019a',
            name: 'MAX_UINT',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
        ];
        return Promise.resolve(data as ResourcePayload<R>);
      } else if (resource === 'contract_methods_write') {
        const data: unknown = [
          {
            constant: false,
            inputs: [
              {
                name: '_upgradedAddress',
                type: 'address',
              },
            ],
            method_id: '0753c30c',
            name: 'deprecate',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: '_spender',
                type: 'address',
              },
              {
                name: '_value',
                type: 'uint256',
              },
            ],
            method_id: '095ea7b3',
            name: 'approve',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: '_evilUser',
                type: 'address',
              },
            ],
            method_id: '0ecb93c0',
            name: 'addBlackList',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: '_from',
                type: 'address',
              },
              {
                name: '_to',
                type: 'address',
              },
              {
                name: '_value',
                type: 'uint256',
              },
            ],
            method_id: '23b872dd',
            name: 'transferFrom',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [],
            method_id: '3f4ba83a',
            name: 'unpause',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [],
            method_id: '8456cb59',
            name: 'pause',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: '_to',
                type: 'address',
              },
              {
                name: '_value',
                type: 'uint256',
              },
            ],
            method_id: 'a9059cbb',
            name: 'transfer',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'newBasisPoints',
                type: 'uint256',
              },
              {
                name: 'newMaxFee',
                type: 'uint256',
              },
            ],
            method_id: 'c0324c77',
            name: 'setParams',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'amount',
                type: 'uint256',
              },
            ],
            method_id: 'cc872b66',
            name: 'issue',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'amount',
                type: 'uint256',
              },
            ],
            method_id: 'db006a75',
            name: 'redeem',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: '_clearedUser',
                type: 'address',
              },
            ],
            method_id: 'e4997dc5',
            name: 'removeBlackList',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'newOwner',
                type: 'address',
              },
            ],
            method_id: 'f2fde38b',
            name: 'transferOwnership',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: '_blackListedUser',
                type: 'address',
              },
            ],
            method_id: 'f3bdc228',
            name: 'destroyBlackFunds',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ];
        return Promise.resolve(data as ResourcePayload<R>);
      } else if (resource === 'address_tabs_counters') {
        return Promise.resolve(ADDRESS_TABS_COUNTERS as ResourcePayload<R>);
      } else if (resource === 'address_counters') {
        return Promise.resolve(ADDRESS_COUNTERS as ResourcePayload<R>);
      } else if (resource === 'user_ops_account') {
        return Promise.resolve(USER_OPS_ACCOUNT as ResourcePayload<R>);
      } else if (resource === 'homepage_indexing_status') {
        const data: unknown = {
          finished_indexing: true,
          finished_indexing_blocks: true,
          indexed_blocks_ratio: '1.00',
          indexed_internal_transactions_ratio: '1.00',
        };
        return Promise.resolve(data as ResourcePayload<R>);
      } else if (resource === 'config_backend_version') {
        const data: unknown = { backend_version: 'v6.1.0-beta.+commit.143d1084' };
        return Promise.resolve(data as ResourcePayload<R>);
      }

      const data = apiFetch(resource, { pathParams, queryParams, fetchParams }) as Promise<ResourcePayload<R>>;
      return data;
    },
    ...queryOptions,
  });
}
