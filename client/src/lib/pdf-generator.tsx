import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font, Image } from '@react-pdf/renderer';
import { formatCurrency, formatDate, numberToVietnameseText } from './utils';
import { Settings } from './settings';

// Register font for Vietnamese support
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
    },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.woff2',
      fontWeight: 'bold',
    },
  ],
});

// Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontFamily: 'Roboto',
    fontSize: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  logo: {
    width: 60,
    height: 60,
  },
  companyInfo: {
    flex: 1,
    paddingLeft: 15,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  companyDetails: {
    fontSize: 9,
    lineHeight: 1.3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoBox: {
    flex: 1,
    marginRight: 10,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 10,
    lineHeight: 1.2,
  },
  table: {
    marginTop: 15,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottom: 1,
    borderBottomColor: '#000',
    padding: 5,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#ccc',
    padding: 5,
    fontSize: 9,
  },
  col1: { width: '8%' },
  col2: { width: '30%' },
  col3: { width: '8%' },
  col4: { width: '8%' },
  col5: { width: '15%' },
  col6: { width: '15%' },
  col7: { width: '8%' },
  col8: { width: '8%' },
  totalSection: {
    marginTop: 15,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 3,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 10,
  },
  amountInWords: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f9f9f9',
    border: 1,
    borderColor: '#ddd',
  },
  bankInfo: {
    marginTop: 15,
    padding: 8,
    backgroundColor: '#f9f9f9',
    border: 1,
    borderColor: '#ddd',
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 9,
    color: '#666',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  signatureBox: {
    width: '45%',
    textAlign: 'center',
  },
  signatureLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  signatureName: {
    fontSize: 9,
    borderTop: 1,
    borderTopColor: '#000',
    paddingTop: 5,
  },
});

interface PDFDocumentProps {
  title: string;
  code: string;
  date: Date;
  customer: any;
  vehicle: any;
  items: any[];
  subtotal: number;
  tax?: number;
  total: number;
  settings: Settings;
  notes?: string;
  type: 'quotation' | 'repair' | 'invoice';
}

const PDFDocument: React.FC<PDFDocumentProps> = ({
  title,
  code,
  date,
  customer,
  vehicle,
  items,
  subtotal,
  tax = 0,
  total,
  settings,
  notes,
  type,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        {settings.logoUrl && (
          <Image style={styles.logo} src={settings.logoUrl} />
        )}
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{settings.garageName}</Text>
          <Text style={styles.companyDetails}>
            {settings.garageAddress && `Địa chỉ: ${settings.garageAddress}\n`}
            {settings.garagePhone && `ĐT: ${settings.garagePhone}`}
            {settings.garageEmail && ` - Email: ${settings.garageEmail}`}
            {settings.garageTaxCode && `\nMã số thuế: ${settings.garageTaxCode}`}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Document Info */}
      <View style={styles.infoRow}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Số: {code}</Text>
          <Text style={styles.infoLabel}>Ngày: {formatDate(date)}</Text>
        </View>
      </View>

      {/* Customer Info */}
      <View style={styles.infoRow}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>THÔNG TIN KHÁCH HÀNG:</Text>
          <Text style={styles.infoValue}>
            Họ tên: {customer?.name || 'N/A'}
            {'\n'}Điện thoại: {customer?.phone || 'N/A'}
            {customer?.address && `\nĐịa chỉ: ${customer.address}`}
            {customer?.email && `\nEmail: ${customer.email}`}
          </Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>THÔNG TIN XE:</Text>
          <Text style={styles.infoValue}>
            Biển số: {vehicle?.licensePlate || 'N/A'}
            {'\n'}Hãng xe: {vehicle?.brand || 'N/A'}
            {'\n'}Dòng xe: {vehicle?.model || 'N/A'}
            {vehicle?.year && `\nNăm SX: ${vehicle.year}`}
          </Text>
        </View>
      </View>

      {/* Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>STT</Text>
          <Text style={styles.col2}>Mô tả</Text>
          <Text style={styles.col3}>ĐVT</Text>
          <Text style={styles.col4}>SL</Text>
          <Text style={styles.col5}>Đơn giá</Text>
          <Text style={styles.col6}>Thành tiền</Text>
          <Text style={styles.col7}>CK%</Text>
          <Text style={styles.col8}>Tổng</Text>
        </View>
        
        {items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.col1}>{index + 1}</Text>
            <Text style={styles.col2}>{item.name || item.description}</Text>
            <Text style={styles.col3}>{item.unit || 'Cái'}</Text>
            <Text style={styles.col4}>{item.quantity}</Text>
            <Text style={styles.col5}>{formatCurrency(item.unitPrice)}</Text>
            <Text style={styles.col6}>{formatCurrency(item.total)}</Text>
            <Text style={styles.col7}>0</Text>
            <Text style={styles.col8}>{formatCurrency(item.total)}</Text>
          </View>
        ))}
      </View>

      {/* Total Section */}
      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tạm tính:</Text>
          <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
        </View>
        {tax > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Thuế VAT:</Text>
            <Text style={styles.totalValue}>{formatCurrency(tax)}</Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng cộng:</Text>
          <Text style={[styles.totalValue, { fontWeight: 'bold' }]}>
            {formatCurrency(total)}
          </Text>
        </View>
      </View>

      {/* Amount in words */}
      <View style={styles.amountInWords}>
        <Text>Bằng chữ: {numberToVietnameseText(total)}</Text>
      </View>

      {/* Bank Info */}
      {settings.bankName && settings.bankAccount && (
        <View style={styles.bankInfo}>
          <Text style={styles.infoLabel}>THÔNG TIN THANH TOÁN:</Text>
          <Text style={styles.infoValue}>
            Ngân hàng: {settings.bankName}
            {'\n'}Số TK: {settings.bankAccount}
            {settings.bankOwner && `\nChủ TK: ${settings.bankOwner}`}
            {settings.bankBranch && `\nChi nhánh: ${settings.bankBranch}`}
          </Text>
        </View>
      )}

      {/* Notes */}
      {notes && (
        <View style={styles.amountInWords}>
          <Text style={styles.infoLabel}>Ghi chú:</Text>
          <Text>{notes}</Text>
        </View>
      )}

      {/* Signature Section */}
      <View style={styles.signatureSection}>
        <View style={styles.signatureBox}>
          <Text style={styles.signatureLabel}>KHÁCH HÀNG</Text>
          <Text style={styles.signatureName}>(Ký và ghi rõ họ tên)</Text>
        </View>
        <View style={styles.signatureBox}>
          <Text style={styles.signatureLabel}>NGƯỜI LẬP</Text>
          <Text style={styles.signatureName}>(Ký và ghi rõ họ tên)</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Cảm ơn quý khách hàng!</Text>
    </Page>
  </Document>
);

export { PDFDocument, PDFDownloadLink };