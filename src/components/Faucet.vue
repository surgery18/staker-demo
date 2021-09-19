<template>
    <div v-if="!loading">
        <div class="card text-center">
            <div class="card-header">
                Faucet
            </div>
            <div class="card-body form-group">
                <h5 class="card-title">Grab tokens here</h5>
                <select class="form-select">
                    <option v-for="token,index in tokens" :key="index" :value="token.address" v-text="token.name"></option>
                </select>
                <input type="text" class="form-control my-4" placeholder="Wallet Address" v-model="wa" />
                <button type="button" class="btn btn-primary" @click="faucetTokens" :disabled="timeLeft">Give Me!</button>
            </div>
            <div class="card-footer text-muted" v-text="timeLeft" v-if="timeLeft != 0"></div>
        </div>  
    </div>
</template>

<script>
import WoodToken from "../../build/contracts-final/WoodToken.json"
import {mapState} from "vuex"
import Swal from 'sweetalert2'
import moment from 'moment'

export default {
    name: "Faucet",
    data() {
        return {
            loading: false,
            tokens: [{
                name: "WoodToken",
                addres: "",
                // contract: null,
            }],
            token: '',
            wa: "",
            lastCalled: 0,
            faucetTime: 0,
            timeLeft: 0,
            timeLeftInterval: 0,
        }
    },
    mounted() {
        if (this.contractsLoaded) {
            this.loadContracts()
        }
    },
    watch: {
        contractsLoaded(v, ov) {
            if (v && !ov) {
                this.loadContracts()
            }
        }
    },
    methods: {
        async faucetTokens() {
            const loader = this.$loading.show({loader: 'bars'})
            try {
                const receipt = await this.stakerFactoryContract.methods.faucetTokens(this.token, this.wa).send({from: this.walletAddress})
                const event = receipt?.events?.FacetTokensToUser?.returnValues
                console.log(receipt)
                loader.hide()
                await Swal.fire({
                    title: "Tokens funded into your account.",
                    text: `The token contract ${this.token} gave you ${web3.utils.fromWei(event._amount)} tokens.`,
                    icon: 'success',
                    allowOutsideClick: false,
                })
                await this.loadContracts()
            } catch(e) {
                console.log(e)
                loader.hide()
            }
        },
        async loadContracts() {
            //load the blood token address
            const nid = await web3.eth.net.getId()
            let std = WoodToken.networks[nid]
            if (std) {
                this.tokens[0].address = std.address
                // this.tokens[0].contract = new web3.eth.Contract(WoodToken.abi, std.address)
                this.token = this.tokens[0].address

                //grab the current time left for default token (this code will need to change if more tokens)
                this.lastCalled = await this.stakerFactoryContract.methods.faucetTimes(std.address, this.walletAddress).call({from: this.walletAddress})
                console.log("timeLeft", this.lastCalled)
            }
            this.faucetTime = await this.stakerFactoryContract.methods.FAUCET_TIME().call({from: this.walletAddress})
            console.log("faucetTime", this.faucetTime)

            if (this.timeLeftInterval) {
                clearInterval(this.timeLeftInterval)
                this.timeLeftInterval = 0
            }
            
            this.timeLeftInterval = setInterval(() => {
                const now = +moment().unix()
                const then = +this.lastCalled + +this.faucetTime
                const diff = then-now
                if (diff < 0) {
                    clearInterval(this.timeLeftInterval)
                    this.timeLeftInterval = 0
                    this.timeLeft = 0
                    return
                }
                const dur = moment.duration(diff, 'seconds')
                this.timeLeft = `Days: ${dur.days()} - Hours: ${dur.hours()} - Minutes: ${dur.minutes()} - Seconds: ${dur.seconds()}`
            }, 1000),

            this.loading = false
        },
    },
    beforeDestory() {
        if (this.timeLeftInterval) {
            clearInterval(this.timeLeftInterval)
            this.timeLeftInterval = 0
        }
    },
    computed: {
        ...mapState(['walletAddress','stakerFactoryContract', 'contractsLoaded']),
        // countdown() {
        //     if (this.lastCalled > 0) {
        //         const now = +moment().unix()
        //         const then = +this.lastCalled + +this.faucetTime
        //         const diff = then-now
        //         console.log(diff, now, then)
        //         const dur = moment(diff)
        //         // const dur = moment.duration(diff, "milliseconds")
        //         return dur.format("HH:mm:ss")
        //     }
        //     return 0
        // }
    },
}
</script>

<style>

</style>