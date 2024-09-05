// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./utilities/IAggregationRouterV6.sol";

contract SimpleFlashLoan is FlashLoanSimpleReceiverBase {
    GenericRouter public immutable aggregationRouterV6 = GenericRouter(payable(0x111111125421cA6dc452d289314280a0f8842A65));

    constructor(IPoolAddressesProvider provider) FlashLoanSimpleReceiverBase(provider) {}

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address,
        bytes calldata params
    ) external override returns (bool) {
        (address[] memory path, bytes[] memory swapData) = abi.decode(params, (address[], bytes[]));
        uint256 currentAmount = amount;

        for (uint i = 0; i < path.length - 1; i++) {
            IERC20(path[i]).approve(address(aggregationRouterV6), currentAmount);
            (bool success, bytes memory returnData) = address(aggregationRouterV6).call(swapData[i]);
            require(success, "Swap failed");
            currentAmount = abi.decode(returnData, (uint256));
        }

        uint256 amountOwed = amount + premium;
        IERC20(asset).approve(address(POOL), amountOwed);
        return true;
    }

    function requestFlashLoan(
        address _token,
        uint256 _amount,
        address[] calldata _path,
        bytes[] calldata _swapData
    ) external {
        bytes memory params = abi.encode(_path, _swapData);
        POOL.flashLoanSimple(address(this), _token, _amount, params, 0);
    }

    receive() external payable {}
}