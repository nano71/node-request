const selector = {
    taobao: {
        search: "input.search-combobox-input",
        platform: "taobao",
        urls: `div.ctx-box.J_MouseEneterLeave.J_IconMoreNew > .title > a`,
        face: {
            a(index) {
                return `#mainsrp-itemlist .items .item:nth-child(${index}) .title > a`
            },
            title(index) {
                return `#mainsrp-itemlist .items .item:nth-child(${index}) .title > a`
            },
            img(index) {
                return `#mainsrp-itemlist .items .item:nth-child(${index}) img.J_ItemPic.img`
            }
        },
        name: ".title .J_ClickStat",
        detail: {
            area: ".tb-item-info",
            title: "#J_Title > h3",
            shop: "a.shop-name-link",
            shop2: "#J_ShopInfo > div > div.tb-shop-info-hd > div.tb-shop-name > dl > dd > strong > a",
            label: "#J_isku dl.J_Prop.tb-prop:nth-child(1) > dt",
            label2: "#J_isku dl.J_Prop.tb-prop:nth-child(2) > dt",
            price: ".tb-rmb-num",
            sales: "#J_SellCounter",
            selectArea: "dl.J_Prop.tb-prop:nth-child(1)",
            selectArea2: "dl.J_Prop.tb-prop:nth-child(2)",
            selected: "li.tb-selected",
            item: "li:not(.tb-out-of-stock)",
            details: ".attributes-list li"
        },
        nextUrl: ".item.next",
        pageInput: ".J_Input[type=number]",
        sort: "ul > li.sort:nth-child(2) a"
    },
    tmall: {
        search: "input#mq",
        platform: "tmall",
        urls: `#J_ItemList > div > div > p.productTitle > a`,
        face: {
            a(index) {
                return `#J_ItemList div.product:nth-child(${index}) p.productTitle a`
            },
            title(index) {
                return `#J_ItemList div.product:nth-child(${index}) p.productTitle a`
            },
            img(index) {
                return `#J_ItemList > div:nth-child(${index}) > div > div.productImg-wrap > a > img`
            }
        },
        detail: {
            area: "#J_DetailMeta",
            title: "#J_DetailMeta > div.tm-clear > div.tb-property > div > div.tb-detail-hd > h1",
            shop: "#shopExtra > div.slogo > a > strong",
            shop2: "#side-shop-info > div > h3 > div > a",
            label: "#J_DetailMeta .tm-sale-prop > dt.tb-metatit",
            label2: "#J_DetailMeta .tm-sale-prop:nth-child(2) > dt.tb-metatit",
            price: "span.tm-price",
            sales: "span.tm-count",
            selectArea: "dl.tm-sale-prop:nth-child(1)",
            selectArea2: "dl.tm-sale-prop:nth-child(2)",
            selected: "li.tb-selected",
            item: "li:not(.tb-out-of-stock)",
            details: "#J_AttrUL li"
        },
        nextUrl: "a.ui-page-next",
        pageInput: ".ui-page-skipTo"
    },
    jd: {
        search: "input#key",
        platform: "jd",
        urls: "#J_goodsList > ul li.gl-item .p-name a",
        face: {
            a(index) {
                return `#J_goodsList > ul > li:nth-child(${index}) > div > div.p-name > a`
            },
            title(index) {
                return `#J_goodsList > ul > li:nth-child(${index}) > div > div.p-name > a`
            },
            img(index) {
                return `#J_goodsList > ul > li:nth-child(${index}) > div > div.p-img > a > img`
            }
        },
        name: ".p-name em",
        detail: {
            area: "body > div:nth-child(10) > div",
            title: "div.sku-name",
            shop: "#popbox > div > div.mt > h3 > a",
            shop2: "#crumb-wrap > div > div.contact.fr.clearfix > div.J-hove-wrap.EDropdown.fr > div:nth-child(1) > div > a",
            label: "#choose-attr-1 > .dt",
            label2: "#choose-attr-2 > .dt",
            price: "span.p-price > span.price",
            sales: "#comment-count > a",
            selectArea: "#choose-attr-1 > div.dd",
            selectArea2: "#choose-attr-2 > div.dd",
            selected: ".item.selected",
            item: ".item",
            details: ".p-parameter-list li"
        },
        nextUrl: "a.pn-next",
        pageInput: ".p-skip input",
        sort: ".f-sort > a:nth-child(2)"
    }
}
module.exports.selector = selector
