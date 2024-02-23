import { Box, Button, Text, Radio, RadioGroup, Stack } from '@chakra-ui/react';
import { useLocalStorage } from '@uidotdev/usehooks';
import React from 'react';

import { useWallets, useWallet, UpdateTimeKey } from 'lib/hooks/useStorage';
import * as mixpanel from 'lib/mixpanel/index';
import storage from 'lib/storage';
import getDefaultTransitionProps from 'theme/utils/getDefaultTransitionProps';
import AddressEntity from 'ui/shared/entities/address/AddressEntity';
type Props = {
  address?: string;
  disconnect?: () => void;
};

const WalletMenuContent = ({ disconnect }: Props) => {
  const onAddressClick = React.useCallback(() => {
    mixpanel.logEvent(mixpanel.EventTypes.WALLET_ACTION, { Action: 'Address click' });
  }, []);
  const [ , setUpdateTime ] = useLocalStorage<number>(UpdateTimeKey);

  const wallets = useWallets();
  const latestWallet = useWallet();

  return (
    <Box>
      <Text
        fontSize="sm"
        fontWeight={ 600 }
        mb={ 1 }
        { ...getDefaultTransitionProps() }
      >
        My wallet
      </Text>
      <Text
        fontSize="sm"
        mb={ 5 }
        fontWeight={ 400 }
        color="text_secondary"
        { ...getDefaultTransitionProps() }
      >
        Your wallet is used to interact with apps and contracts in the explorer.
      </Text>
      <RadioGroup value={ latestWallet.address }>
        <Stack spacing={ 0 }>
          {
            wallets.map(wallet => {
              return (
                <Radio mb={ 3 }
                  onChange={ (event) => {
                    storage.selectWallet(event.target.value);
                    setUpdateTime(new Date().getTime());
                  } }
                  colorScheme="blue"
                  key={ wallet.name }
                  value={ wallet.address }
                >
                  <AddressEntity
                    address={{ hash: wallet.address, name: wallet.name }}
                    noTooltip
                    truncation="dynamic"
                    fontSize="sm"
                    fontWeight={ 700 }
                    color="text"
                    mb={ 0 }
                    onClick={ onAddressClick }
                  />
                </Radio>
              );
            })
          }
        </Stack>
      </RadioGroup>
      <Button size="sm" width="full" variant="outline" onClick={ disconnect }>
        Disconnect
      </Button>
      <Button size="sm" width="full" variant="outline" onClick={ disconnect }>
        Connect
      </Button>
    </Box>
  );
};

export default WalletMenuContent;
