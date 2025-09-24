
export const formatAddress = (addr: string | null): string => {
  return addr
    ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
    : "";
};
