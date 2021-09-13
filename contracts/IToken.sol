// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract IToken is IERC20 {
  function owner() public virtual returns (address);
  function mint(address to, uint256 amount) public virtual;
  function addContractToMinterRole(address to) external virtual;
  function addContractAsAdmin(address _addr) external virtual;
}
