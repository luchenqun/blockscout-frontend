import { TagLabel } from '@chakra-ui/react';
import React from 'react';

import Tag from 'ui/shared/chakra/Tag';
import IconSvg from 'ui/shared/IconSvg';

export interface Props {
  height: number | null;
  isLoading?: boolean;
}

const BlockHeight = ({ height, isLoading }: Props) => {
  return (
    <Tag colorScheme="gray" display="inline-flex" isLoading={ isLoading }>
      <IconSvg boxSize={ 2.5 } name="block_slim" mr={ 2 }/>
      <TagLabel>{ height }</TagLabel>
    </Tag>

  );
};

export default BlockHeight;
