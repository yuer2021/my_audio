new Vue({
    el: '#app',
    data: function () {
        return {
            nodeUrl: 'http://localhost:3000',
            activeKey: '0',
            advertisements: [
                {
                    title: 'Yuer audio',
                    text: 'the best audio website of universe',
                    img: 'img/music.png'
                },
                {
                    title: 'love',
                    text: '',
                    img: 'https://unsplash.it/1600/900?random'
                },
                {
                    title: 'Space For Rent 1',
                    text: '',
                    img: 'https://source.unsplash.com/user/erondu/1600x900'
                },
                {
                    title: 'Space For Rent 2',
                    text: '',
                    img: 'https://cdn.seovx.com/?mom=302'
                },
                {
                    title: 'Space For Rent 3',
                    text: '',
                    img: 'https://imgapi.cn/cos.php'
                },
                {
                    title: 'Space For Rent 4',
                    text: '',
                    img: 'https://unsplash.it/1600/900?random'
                },
                {
                    title: 'Space For Rent 5',
                    text: '',
                    img: 'https://imgapi.cn/api.php'
                },
            ],
            tableData: [],
            dialogVisible: false,
            activeAudio: {},
            searchName: '',
            duration:'',
            durationType:'',
            form:{
                name:'',
                password:'',
                email:''
            }
        }
    },
    methods: {
        handleSelect (key, keyPath) {
            // console.log(key, keyPath)
            this.activeKey = key
        },
        FJ_Upload (param) {
            var formData = new FormData()
            formData.append('myAudio', param.file)
            this.submitNew(formData)
        },
        async submitNew (formData) {
            const res = await fetch(`${this.nodeUrl}/uploads`, {
                method: 'post',
                body: formData,
            })
            // console.log(res)
        },
        clickDetail (index, tableData) {
            this.dialogVisible = true
            this.activeAudio = tableData[index]
        },
        clickDownload (index, tableData) {
            window.open(`${this.nodeUrl}/uploads/${tableData[index].filename}`, '_blank')
        },
        clickDeleteAudio (index, tableData) {
            fetch(`${this.nodeUrl}/delete_audios?name=${tableData[index].filename}`).then(response => response.json()).then(res => {
            })
        },
        getTable () {
            // if (this.searchName) {
                fetch(`${this.nodeUrl}/duration?name=${this.searchName}&type=${this.durationType||'0'}&duration=${this.duration||'0'}`).then(response => response.json()).then(res => {
                    // console.log(res)
                    this.tableData = res
                })
            // } else {
            //     fetch(`${this.nodeUrl}/findAll`).then(response => response.json()).then(res => {
            //         console.log(res)
            //         this.tableData = res
            //     })
            // }
        },
        register(){
            fetch(`${this.nodeUrl}/register?name=${this.form.name}&password=${this.form.password}&email=${this.form.email}`).then(response => response.json()).then(res => {
                console.log('res',res)
                console.log('res.msg',res.msg)
                if(res.msg==='success') {
                    this.activeKey = 2
                } else {
                    this.activeKey = 3
                }
            })
        }
    },
    created () {
        this.getTable()
    }
})
