pragma solidity >=0.5.0 <0.8.22;
// SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract BankAccount {
    event Deposit(
        address indexed user,
        uint indexed accountId,
        uint value,
        uint timestamp
    );
    event WithdrawRequested(
        address indexed user,
        uint indexed accountId,
        uint withdrawId,
        uint amount,
        uint timestamp
    );
    event Withdraw(uint indexed withdrawId, uint timestamp);
    event AccountCreated(address[] owners, uint indexed id, uint timestamp);


    struct Account {
        address[] owners; 
        uint balance;
        mapping(uint => WithdrawRequest) withdrawRequests;
    }

    struct WithdrawRequest {
        address user;
        uint amount;
        mapping(address => bool) ownersApproved;
        uint approvals;
        bool approved;
    }
    mapping(uint => Account) accounts;
    mapping(address => uint[]) useraccounts;

    uint nextAccountId;
    uint nextWithdrawId;

    modifier accountOwner(uint accountId) {
        bool isOwner;
        for(uint idx; idx < accounts[accountId].owners.length; idx++) {
            if (accounts[accountId].owners[idx] == msg.sender){
                isOwner = true;
                break;
            }
        }
        require(isOwner, "you are not an owner of this account");
        _;
    }

    modifier validOtherOwners(address[] calldata otherOwners) {
        bool isInvalidOwner;
        require(otherOwners.length < 5, "only 4 owners maximum");
        for (uint idx; idx < otherOwners.length; idx++) {
            if (otherOwners[idx] == msg.sender){
                isInvalidOwner = true;
                revert("sender cannot be partof other owners");
            }
            for (uint idj = idx+1; idj < otherOwners.length; idj++) {
                if (otherOwners[idx] == otherOwners[idj]) {
                    isInvalidOwner = true;
                    revert("sender cannot have duplicate in other owners");
                }
            }
        }
        require(!isInvalidOwner, "not valid member");
        _;
    }

    modifier validApprover(uint accountId, uint withdrawId) {
        WithdrawRequest storage request = accounts[accountId].withdrawRequests[withdrawId];
        require(request.approved == false, "only unapproved requests can be approved");
        require(request.user != address(0), "only valid requests can approved");
        require(request.user != msg.sender, "only other memebers can approve");
        require(request.ownersApproved[msg.sender] == false, "only one approval per owner");
        _;
    }

    modifier validWithdrawer(uint accountId, uint withdrawId) {
        WithdrawRequest storage request = accounts[accountId].withdrawRequests[withdrawId];
        require(request.approved == true, "only approved requests can be withdrawn");
        require(request.user == msg.sender, "only request creator can withdraw");
        _;
    }

    modifier sufficientBalance(uint accountId, uint amount) {
        bool isSufficient;
        if (accounts[accountId].balance >= amount){
            isSufficient = true;
        }
        require(isSufficient, "you do not have sufficient funds in this account");
        _;
    }

    function deposit(uint accountId) external payable accountOwner(accountId) {
        accounts[accountId].balance += msg.value;
        emit Deposit(msg.sender, accountId, msg.value, block.timestamp);
    }

    function createAccount(address[] calldata otherOwners) external validOtherOwners(otherOwners) {
        address[] memory owners = new address[](otherOwners.length + 1);
        owners[otherOwners.length] = msg.sender;

        uint id = nextAccountId;
        for (uint idx; idx < owners.length; idx++){
            if (idx < owners.length -1) {
                owners[idx] = otherOwners[idx];
            }

            if (useraccounts[owners[idx]].length > 2) {
                revert("owner account is more");
            } 
            useraccounts[owners[idx]].push(id);
        }

        accounts[id].owners = owners;
        nextAccountId++;
        emit AccountCreated(owners, id, block.timestamp);
    }

    function requestWithdrawal(uint accountId, uint amount) external accountOwner(accountId) sufficientBalance(accountId, amount) {
        uint id = nextWithdrawId;
        accounts[accountId].withdrawRequests[id].amount = amount;
        accounts[accountId].withdrawRequests[id].user = msg.sender;
        
        nextWithdrawId++;
        emit WithdrawRequested(msg.sender, accountId, id, amount, block.timestamp);
    }

    function approveWithdrawal(uint accountId, uint withdrawId) external accountOwner(accountId) validApprover(accountId, withdrawId) {
        WithdrawRequest storage request = accounts[accountId].withdrawRequests[withdrawId];
        request.ownersApproved[msg.sender] = true;
        request.approvals++;
        if (request.approvals == accounts[accountId].owners.length -1) {
            request.approved = true;
        }
    }

    function withdraw(uint accountId, uint withdrawId) external validWithdrawer(accountId, withdrawId) {
        uint amount = accounts[accountId].withdrawRequests[withdrawId].amount;
        require(accounts[accountId].balance >= amount, "insufficient amount");
        
        accounts[accountId].balance -= amount;
        delete accounts[accountId].withdrawRequests[withdrawId];

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent);

        emit Withdraw(withdrawId, block.timestamp);
    } 

    function getBalance(uint accountId) public view returns (uint) {
        return accounts[accountId].balance;
    }

    function getOwners(uint accountId) public view returns (address[] memory) {
        return accounts[accountId].owners;
    }

    function getApprovals(uint accountId, uint withdrawId) public view returns (uint) {
        return accounts[accountId].withdrawRequests[withdrawId].approvals;

    }

    function getAccounts() public view returns (uint[] memory) {
        return useraccounts[msg.sender];
    }
}
