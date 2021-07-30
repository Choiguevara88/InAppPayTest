import React, {useState, useEffect, useCallback } from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, useColorScheme, View, Alert, Button } from 'react-native';
import { Colors, Header } from 'react-native/Libraries/NewAppScreen';
import RNIap, { InAppPurchase, PurchaseError, SubscriptionPurchase, finishTransaction, purchaseErrorListener, purchaseUpdatedListener } from 'react-native-iap';

// 상품 목록 정보 (=플레이스토에 등록된 ID값)
const itemSkus = Platform.select({
  default : [ 'inapptest.product.001',]
});

let purchaseUpdateSubscription; // 인앱결제 성공 리스너
let purchaseErrorSubscription;  // 인앱결제 실패 리스너

function App() {

  const [isSubscription, setIsSubscription] = useState(false);  // 결제여부 상태값
  const [subscription, setSubscription] = useState(undefined);  // 결제상품정보 상태값
  
  // 결제요청함수
  const _requestSubscription = () => {
    if (subscription) { 
      RNIap.requestPurchase(subscription.productId, false);
    }
  };

  // 결제 정보 초기화 라이브러리를 초기화하기 위해서는 아래와 같은 코드를 사용합니다.
  const _initIAP = useCallback(async () => {
    try {
      const result = await RNIap.initConnection();  // 결제 
      // console.log("::::::::::::::::", RNIap.getAvailablePurchases());
      if (result === false) { Alert.alert('제품 정보 조회 실패'); return; }
    } catch (err) {
      // console.log("1.err ::::: ", err.code, err.message);
      Alert.alert('제품 정보 조회 실패');
    }
    
    // 구매한 상품들 소비
    try{ RNIap.consumeAllItemsAndroid(); } catch(e) { console.log("2.err ::::: ",e.code, e.message)}
    
    // 제품 정보를 가져와서 state에 저장
    const subscriptions = await RNIap.getProducts(itemSkus);
    setSubscription({ ...subscriptions[0], });              
    
    // 인앱 결제가 성공했을 때 리스너
    purchaseUpdateSubscription = purchaseUpdatedListener(
      (purchase: InAppPurchase | SubscriptionPurchase) => {
        // console.log(purchase);
        const receipt = purchase.purchaseToken;
        // 구매한 상품들 소비
        // try{ RNIap.consumeAllItemsAndroid(); } catch(e) {}
        
        if (receipt) {
          finishTransaction(purchase, false)
            .then(() => { 
              console.log("결제 완료 ::::::: ", purchase); setIsSubscription(true); 
            })
            .catch(() => { 
              setIsSubscription(false); 
            });
        }
      },
    );
    
    // 인앱 결제가 취소 또는 실패했을 때 리스너
    purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
      // console.error(error);
      if (error.code !== 'E_USER_CANCELLED' && error.code !== 'E_ALREADY_OWNED') {
        // E_USER_CANCELLED == "취소"
        // E_ALREADY_OWNED == "이미 상품 보유"
        Alert.alert('결제 실패');
      }
    });
  }, []);

  useEffect(() => {
    _initIAP(); // 처음 마운트 될 때 상품 초기화 및 구매내역 제거
    return (): void => {
      if (purchaseUpdateSubscription) purchaseUpdateSubscription.remove();  // 언마운트 시 리스너 제거
      if (purchaseErrorSubscription)  purchaseErrorSubscription.remove();   // 언마운트 시 리스너 제거
    }
  }, []);
  
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={backgroundStyle}>
        <Header />
        <View
          style={{ backgroundColor: isDarkMode ? Colors.black : Colors.white, }}>
          {subscription && 
          <Section title={subscription.title.split(' (')[0]}>
            {subscription.description} <Text style={styles.highlight}>{subscription.localizedPrice}</Text>
          </Section>
          }
          <Section title="결제 여부">
            {isSubscription ? "결제 완료" : "미결제" }
          </Section>
          <Section title="결제하기">
          <Button onPress={()=>_requestSubscription()} title="결제진행" />
          </Section>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default App;

const Section = ({children, title}) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text style={[ styles.sectionTitle, { color: isDarkMode ? Colors.white : Colors.black, }]}>
        {title}
      </Text>
      <Text style={[ styles.sectionDescription, { color: isDarkMode ? Colors.light : Colors.dark, },]}>
        {children}
      </Text>
    </View>
  );
};
const styles = StyleSheet.create({
  sectionContainer:   { marginTop: 32, paddingHorizontal: 24, },
  sectionTitle:       { fontSize: 24, fontWeight: '600', },
  sectionDescription: { marginTop: 8, fontSize: 18, fontWeight: '400', },
  highlight:          { fontWeight: '700', },
});