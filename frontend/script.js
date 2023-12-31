// console.log('ethers.providers', ethers.providers)

const provider = new ethers.providers.Web3Provider(window.ethereum);
const abi = [
    "event AccountCreated(address[] owners, uint256 indexed id, uint256 timestamp)",
    "event Deposit(address indexed user, uint256 indexed accountId, uint256 value, uint256 timestamp)",
    "event Withdraw(uint256 indexed withdrawId, uint256 timestamp)",
    "event WithdrawRequested(address indexed user, uint256 indexed accountId, uint256 withdrawId, uint256 amount, uint256 timestamp)",
    "function approveWithdrawl(uint256 accountId, uint256 withdrawId)",
    "function createAccount(address[] otherOwners)",
    "function deposit(uint256 accountId) payable",
    "function getAccounts() view returns (uint256[])",
    "function getApprovals(uint256 accountId, uint256 withdrawId) view returns (uint256)",
    "function getBalance(uint256 accountId) view returns (uint256)",
    "function getOwners(uint256 accountId) view returns (address[])",
    "function requestWithdrawl(uint256 accountId, uint256 amount)",
    "function withdraw(uint256 accountId, uint256 withdrawId)"
  ];
  const address = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  let contract = null

  async function createAccount() {
    await getAccess();
    const owners = document.getElementById("owners").value.split(",").filter(n => n);
    console.log(owners);
    await contract.createAccount(owners).then(() => alert("Success"));
  }
  
  async function viewAccounts() {
    await getAccess();
    const result = await contract.getAccounts();
    document.getElementById("accounts").innerHTML = result;
  }

  async function getAccess() {
    if (contract) return;
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    contract = new ethers.Contract(address, abi, signer);

    const eventLog = document.getElementById("events");
    contract.on("AccountCreated", (owners, id, event) => {
        eventLog.append(`Account created: iD = ${id}, owners = ${owners}`)
    })
  }