"use server"

import { scrapeAmazonProduct } from "../scrapper";

//means all code written here will run only on server

export async function scrapeAndStoreProduct(productURL : string){
    //this function will take product url as string

    if(!productURL){
        return;
    }

    try{
        const scrapedProduct = await scrapeAmazonProduct(productURL);

    }
    catch(error : any){
        throw new Error('Failed to create/update product: ${error.message}')
    }


}