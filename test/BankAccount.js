const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("BankAccount", function () {
  async function deployBankAccount() {

    // Contracts are deployed using the first signer/account by default
    const [addr0, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    const BankAccount = await ethers.getContractFactory("BankAccount");
    const bankAccount = await BankAccount.deploy();

    return { bankAccount, addr0, addr1, addr2, addr3, addr4 };
  }

  async function deployBankAccountWithAccounts(owners = 1, deposit = 0, withdrawls = []) {

    const {bankAccount, addr0, addr1, addr2, addr3, addr4 } = await loadFixture(deployBankAccount);
    let addresses = []
    if (owners == 2) addresses = [addr1.address]
    else if (owners == 3) addresses = [addr1.address, addr2.address]
    else if (owners == 4) addresses = [addr1.address, addr2.address, addr3.address]

    await bankAccount.connect(addr0).createAccount(addresses);
    if (deposit > 0) {
      await bankAccount.connect(addr0).deposit(0, {value: deposit.toString()});
    }
    for (const withdrawl of withdrawls) {
      await bankAccount.connect(addr0).requestWithdrawl(0, withdrawl);
    }

    return { bankAccount, addr0, addr1, addr2, addr3, addr4 };
  }

  describe("Deloyment", () => {
    it("should deploy without any error", async () => {
      await loadFixture(deployBankAccount);
    })
  })

  describe("Creating Account", () => {
    it("should create a signle account", async () => {
      const { bankAccount, addr0 } = await loadFixture(deployBankAccount);
      await bankAccount.connect(addr0).createAccount([]);
      const accounts = await bankAccount.connect(addr0).getAccounts();
      expect(accounts.length).to.equal(1);
    })

    it("should create a double account", async () => {
      const { bankAccount, addr0, addr1 } = await loadFixture(deployBankAccount);
      await bankAccount.connect(addr0).createAccount([addr1.address]);
      const account1 = await bankAccount.connect(addr0).getAccounts();
      expect(account1.length).to.equal(1);

      const account2 = await bankAccount.connect(addr1).getAccounts();
      expect(account2.length).to.equal(1);

      expect(account1[0]).to.equal(account2[0]);
    })

    it("should create a triple account", async () => {
      const { bankAccount, addr0, addr1, addr2 } = await loadFixture(deployBankAccount);
      await bankAccount.connect(addr0).createAccount([addr1.address, addr2.address]);

      const account1 = await bankAccount.connect(addr0).getAccounts();
      expect(account1.length).to.equal(1);
      const account2 = await bankAccount.connect(addr1).getAccounts();
      expect(account2.length).to.equal(1);
      const account3 = await bankAccount.connect(addr2).getAccounts();
      expect(account3.length).to.equal(1);
    })

    it("should create a quadruple account", async () => {
      const { bankAccount, addr0, addr1, addr2, addr3 } = await loadFixture(deployBankAccount);
      await bankAccount.connect(addr0).createAccount([addr1.address, addr2.address, addr3.address]);

      const account1 = await bankAccount.connect(addr0).getAccounts();
      expect(account1.length).to.equal(1);
      const account2 = await bankAccount.connect(addr1).getAccounts();
      expect(account2.length).to.equal(1);
      const account3 = await bankAccount.connect(addr2).getAccounts();
      expect(account3.length).to.equal(1);
      const account4 = await bankAccount.connect(addr2).getAccounts();
      expect(account4.length).to.equal(1);
    })

    it("should not allow creating account with duplicate address", async () => {
      const { bankAccount, addr0 } = await loadFixture(deployBankAccount);
      await expect(bankAccount.connect(addr0).createAccount([addr0.address])).to.be.reverted;
    })

    it("should not allow creating account with 5 owners", async () => {
      const { bankAccount, addr0, addr1, addr2, addr3, addr4 } = await loadFixture(deployBankAccount);
      await expect(bankAccount.connect(addr0).createAccount([addr1.address, addr2.address, addr3.address, addr4.address])).to.be.reverted;
    })

    it("should not allow creating of 3 accounts for one address", async () => {
      const { bankAccount, addr0 } = await loadFixture(deployBankAccount);
      for(idx = 0; idx < 3; idx++) {
        await bankAccount.connect(addr0).createAccount([]);
      }

      await expect(bankAccount.connect(addr0).createAccount([])).to.be.reverted;
    }) 
  })

  describe("Depositing into account", () => {
    it("should deposit amount successfully", async () => {
      const { bankAccount, addr0 } = await deployBankAccountWithAccounts(1);
      await expect(bankAccount.connect(addr0).deposit(0, {value: "100"})).to.changeEtherBalances(
        [bankAccount, addr0], ["100", "-100"]
      )
    });

    it("should not allow deposit of non account owner", async () => {
      const { bankAccount, addr0, addr1 } = await deployBankAccountWithAccounts(1);
      await expect(bankAccount.connect(addr1).deposit(0, {value: "100"})).to.be.reverted;
    });
  });

  describe("Withdraw Requests", () => {
    it("should request withdraw successfully", async () => {
      const {bankAccount, addr0} = await deployBankAccountWithAccounts(1, 100);
      await bankAccount.connect(addr0).requestWithdrawl(0, 100);
    });
    it("should not allow request withdraw for more than balance", async () => {
      const {bankAccount, addr0} = await deployBankAccountWithAccounts(1, 100);
      await expect(bankAccount.connect(addr0).requestWithdrawl(0, 101)).to.be.reverted;
    });
    it("should not allow non-owner to request withdraw", async () => {
      const {bankAccount, addr0, addr1} = await deployBankAccountWithAccounts(1, 100);
      await expect(bankAccount.connect(addr1).requestWithdrawl(0, 100)).to.be.reverted;
    });
    it("should allow multiple request withdrawl", async () => {
      const {bankAccount, addr0} = await deployBankAccountWithAccounts(1, 100);
      await bankAccount.connect(addr0).requestWithdrawl(0, 40);
      await bankAccount.connect(addr0).requestWithdrawl(0, 60);
    })
  })

  describe("Withdraw Approval", () => {
    it("should approve request withdrawl successfully", async () => {
      const {bankAccount, addr0, addr1} = await deployBankAccountWithAccounts(2, 100, [100]);
      await bankAccount.connect(addr1).approveWithdrawl(0, 0);
      expect(await bankAccount.getApprovals(0, 0)).to.be.equal(1);
    });
    it("should not non-owner approve request withdrawl", async () => {
      const {bankAccount, addr0, addr1, addr2} = await deployBankAccountWithAccounts(2, 100, [100]);
      await expect(bankAccount.connect(addr2).approveWithdrawl(0, 0)).to.be.reverted;
    });
    it("should not one owner approve request withdrawl multiple times", async () => {
      const {bankAccount, addr0, addr1} = await deployBankAccountWithAccounts(3, 100, [100]);
      await bankAccount.connect(addr1).approveWithdrawl(0, 0);
      await expect(bankAccount.connect(addr1).approveWithdrawl(0, 0)).to.be.reverted;
    });
    it("should request creator approve request withdrawl", async () => {
      const {bankAccount, addr0, addr1} = await deployBankAccountWithAccounts(3, 100, [100]);
      await expect(bankAccount.connect(addr0).approveWithdrawl(0, 0)).to.be.reverted;
    });
  })
  
  describe("Withdraw funds", () => {
    it("it should creator successfully withdraw funds", async () => {
      const { bankAccount, addr0, addr1 } = await deployBankAccountWithAccounts(2, 100, [100]);
      await bankAccount.connect(addr1).approveWithdrawl(0, 0);
      await expect(bankAccount.connect(addr0).withdraw(0, 0)).to.changeEtherBalances(
        [bankAccount, addr0], ["-100", "100"]
      );
    })
    it("it should not allow creator successfully withdraw funds twice", async () => {
      const { bankAccount, addr0, addr1 } = await deployBankAccountWithAccounts(2, 200, [100]);
      await bankAccount.connect(addr1).approveWithdrawl(0, 0);
      await expect(bankAccount.connect(addr0).withdraw(0, 0)).to.changeEtherBalances(
        [bankAccount, addr0], ["-100", "100"]
      );
      await expect(bankAccount.connect(addr0).withdraw(0, 0)).to.be.reverted;
    })
    it("it should not allow non-creator successfully withdraw funds", async () => {
      const { bankAccount, addr1, addr2 } = await deployBankAccountWithAccounts(3, 100, [100]);
      await bankAccount.connect(addr1).approveWithdrawl(0, 0);
      await expect(bankAccount.connect(addr2).withdraw(0, 0)).to.be.reverted;
    })
    it("it should not allow non-approved request successfully withdraw funds", async () => {
      const { bankAccount, addr0 } = await deployBankAccountWithAccounts(3, 100, [100]);
      await expect(bankAccount.connect(addr0).withdraw(0, 0)).to.be.reverted;
    })
  })

});
